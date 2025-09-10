const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const CostCalculator = require('../models/CostCalculator');

const router = express.Router();
const costCalculator = new CostCalculator();

/**
 * GET /api/equipment
 * Get all equipment with filtering and depreciation calculations
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { department_id, status, type, location } = req.query;

    let query = `
      SELECT e.*, d.name as department_name
      FROM equipment e
      JOIN departments d ON e.department_id = d.id
      WHERE 1=1
    `;
    const queryParams = [];
    let paramCount = 0;

    if (department_id) {
      paramCount++;
      query += ` AND e.department_id = $${paramCount}`;
      queryParams.push(department_id);
    }

    if (status) {
      paramCount++;
      query += ` AND e.status = $${paramCount}`;
      queryParams.push(status);
    }

    if (location) {
      paramCount++;
      query += ` AND e.location ILIKE $${paramCount}`;
      queryParams.push(`%${location}%`);
    }

    query += ' ORDER BY e.name';

    const result = await pool.query(query, queryParams);

    // Calculate current depreciation for each equipment
    const equipmentWithDepreciation = result.rows.map(equipment => {
      const depreciation = costCalculator.calculateDepreciation(
        equipment.purchase_cost,
        equipment.purchase_date,
        equipment.depreciation_rate
      );

      return {
        ...equipment,
        depreciation: depreciation,
        current_book_value: depreciation.currentValue
      };
    });

    res.json({
      success: true,
      data: equipmentWithDepreciation
    });

  } catch (error) {
    console.error('Equipment fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch equipment'
    });
  }
});

/**
 * POST /api/equipment
 * Add new equipment
 */
router.post('/', [
  authenticateToken,
  body('name').notEmpty().isString(),
  body('description').optional().isString(),
  body('department_id').isInt(),
  body('purchase_cost').isFloat({ min: 0 }),
  body('purchase_date').isISO8601(),
  body('depreciation_rate').isFloat({ min: 0, max: 1 }),
  body('maintenance_cost_annual').optional().isFloat({ min: 0 }),
  body('metadata').optional().isObject()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const {
      name,
      description,
      department_id,
      purchase_cost,
      purchase_date,
      depreciation_rate = 0.1,
      maintenance_cost_annual = 0,
      metadata,
      location,
      status = 'ACTIVE'
    } = req.body;

    // Calculate initial current value
    const depreciation = costCalculator.calculateDepreciation(
      purchase_cost,
      purchase_date,
      depreciation_rate
    );

    const query = `
      INSERT INTO equipment (name, description, department_id, purchase_cost, purchase_date,
                           depreciation_rate, current_value, maintenance_cost_annual, 
                           status, location, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;

    const result = await pool.query(query, [
      name, description, department_id, purchase_cost, purchase_date,
      depreciation_rate, depreciation.currentValue, maintenance_cost_annual,
      status, location, metadata
    ]);

    res.status(201).json({
      success: true,
      message: 'Equipment added successfully',
      data: {
        ...result.rows[0],
        depreciation: depreciation
      }
    });

  } catch (error) {
    console.error('Equipment creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add equipment'
    });
  }
});

/**
 * GET /api/equipment/:id/reservations
 * Get equipment reservations
 */
router.get('/:id/reservations', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { start_date, end_date, status } = req.query;

    let query = `
      SELECT er.*, u.first_name, u.last_name, u.email, e.name as equipment_name
      FROM equipment_reservations er
      JOIN users u ON er.reserved_by = u.id
      JOIN equipment e ON er.equipment_id = e.id
      WHERE er.equipment_id = $1
    `;
    const queryParams = [id];
    let paramCount = 1;

    if (start_date) {
      paramCount++;
      query += ` AND er.reservation_date >= $${paramCount}`;
      queryParams.push(start_date);
    }

    if (end_date) {
      paramCount++;
      query += ` AND er.reservation_date <= $${paramCount}`;
      queryParams.push(end_date);
    }

    if (status) {
      paramCount++;
      query += ` AND er.status = $${paramCount}`;
      queryParams.push(status);
    }

    query += ' ORDER BY er.reservation_date, er.start_time';

    const result = await pool.query(query, queryParams);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Equipment reservations error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch equipment reservations'
    });
  }
});

/**
 * POST /api/equipment/:id/reserve
 * Reserve equipment
 */
router.post('/:id/reserve', [
  authenticateToken,
  body('reservation_date').isISO8601(),
  body('start_time').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  body('end_time').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  body('purpose').notEmpty().isString(),
  body('course_schedule_id').optional().isInt()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const { reservation_date, start_time, end_time, purpose, course_schedule_id } = req.body;

    // Check if equipment exists and is available
    const equipmentQuery = 'SELECT * FROM equipment WHERE id = $1 AND status = $2';
    const equipmentResult = await pool.query(equipmentQuery, [id, 'ACTIVE']);

    if (equipmentResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Equipment not found or not available'
      });
    }

    // Check for time conflicts
    const conflictQuery = `
      SELECT COUNT(*) as conflicts
      FROM equipment_reservations
      WHERE equipment_id = $1 
      AND reservation_date = $2
      AND status != 'CANCELLED'
      AND (
        (start_time <= $3 AND end_time > $3) OR
        (start_time < $4 AND end_time >= $4) OR
        (start_time >= $3 AND end_time <= $4)
      )
    `;

    const conflictResult = await pool.query(conflictQuery, [
      id, reservation_date, start_time, end_time
    ]);

    if (parseInt(conflictResult.rows[0].conflicts) > 0) {
      return res.status(409).json({
        success: false,
        message: 'Equipment is already reserved for this time slot'
      });
    }

    // Create reservation
    const reservationQuery = `
      INSERT INTO equipment_reservations (equipment_id, reserved_by, course_schedule_id,
                                        reservation_date, start_time, end_time, purpose, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'RESERVED')
      RETURNING *
    `;

    const result = await pool.query(reservationQuery, [
      id, req.user.userId, course_schedule_id, reservation_date, start_time, end_time, purpose
    ]);

    res.status(201).json({
      success: true,
      message: 'Equipment reserved successfully',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Equipment reservation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reserve equipment'
    });
  }
});

/**
 * GET /api/equipment/depreciation-report
 * Generate equipment depreciation report
 */
router.get('/depreciation-report', authenticateToken, async (req, res) => {
  try {
    const { department_id, depreciation_method } = req.query;

    let query = `
      SELECT e.*, d.name as department_name
      FROM equipment e
      JOIN departments d ON e.department_id = d.id
      WHERE e.status != 'RETIRED'
    `;
    const queryParams = [];

    if (department_id) {
      query += ' AND e.department_id = $1';
      queryParams.push(department_id);
    }

    query += ' ORDER BY e.department_id, e.purchase_date DESC';

    const result = await pool.query(query, queryParams);

    // Calculate depreciation for each equipment
    const depreciationReport = result.rows.map(equipment => {
      const depreciation = costCalculator.calculateDepreciation(
        equipment.purchase_cost,
        equipment.purchase_date,
        equipment.depreciation_rate,
        depreciation_method || 'straight_line'
      );

      return {
        id: equipment.id,
        name: equipment.name,
        department: equipment.department_name,
        purchase_cost: equipment.purchase_cost,
        purchase_date: equipment.purchase_date,
        years_owned: depreciation.yearsOwned,
        annual_depreciation: depreciation.annualDepreciation,
        accumulated_depreciation: depreciation.accumulatedDepreciation,
        current_book_value: depreciation.currentValue,
        depreciation_rate: equipment.depreciation_rate,
        maintenance_cost_annual: equipment.maintenance_cost_annual
      };
    });

    // Calculate summary statistics
    const summary = {
      total_equipment: depreciationReport.length,
      total_original_cost: depreciationReport.reduce((sum, item) => sum + parseFloat(item.purchase_cost), 0),
      total_current_value: depreciationReport.reduce((sum, item) => sum + parseFloat(item.current_book_value), 0),
      total_accumulated_depreciation: depreciationReport.reduce((sum, item) => sum + parseFloat(item.accumulated_depreciation), 0),
      annual_depreciation_expense: depreciationReport.reduce((sum, item) => sum + parseFloat(item.annual_depreciation), 0),
      annual_maintenance_cost: depreciationReport.reduce((sum, item) => sum + parseFloat(item.maintenance_cost_annual || 0), 0)
    };

    // Group by department
    const byDepartment = depreciationReport.reduce((acc, item) => {
      if (!acc[item.department]) {
        acc[item.department] = {
          equipment_count: 0,
          total_original_cost: 0,
          total_current_value: 0,
          annual_depreciation: 0,
          annual_maintenance: 0
        };
      }
      
      acc[item.department].equipment_count++;
      acc[item.department].total_original_cost += parseFloat(item.purchase_cost);
      acc[item.department].total_current_value += parseFloat(item.current_book_value);
      acc[item.department].annual_depreciation += parseFloat(item.annual_depreciation);
      acc[item.department].annual_maintenance += parseFloat(item.maintenance_cost_annual || 0);
      
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        equipment: depreciationReport,
        summary: summary,
        by_department: byDepartment
      }
    });

  } catch (error) {
    console.error('Depreciation report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate depreciation report'
    });
  }
});

/**
 * PUT /api/equipment/:id/maintenance
 * Update equipment maintenance status
 */
router.put('/:id/maintenance', [
  authenticateToken,
  body('status').isIn(['ACTIVE', 'MAINTENANCE', 'RETIRED']),
  body('maintenance_notes').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const { status, maintenance_notes } = req.body;

    // If setting to maintenance, cancel any active reservations
    if (status === 'MAINTENANCE') {
      await pool.query(`
        UPDATE equipment_reservations 
        SET status = 'CANCELLED'
        WHERE equipment_id = $1 
        AND reservation_date >= CURRENT_DATE 
        AND status = 'RESERVED'
      `, [id]);
    }

    const query = `
      UPDATE equipment 
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;

    const result = await pool.query(query, [status, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Equipment not found'
      });
    }

    // Log maintenance activity if notes provided
    if (maintenance_notes) {
      await pool.query(`
        INSERT INTO utilization_metrics (department_id, metric_type, metric_date, value, metadata)
        SELECT department_id, 'MAINTENANCE_LOG', CURRENT_DATE, 1, $2
        FROM equipment WHERE id = $1
      `, [id, JSON.stringify({ notes: maintenance_notes, updated_by: req.user.userId })]);
    }

    res.json({
      success: true,
      message: 'Equipment maintenance status updated',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Equipment maintenance update error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update equipment maintenance status'
    });
  }
});

/**
 * GET /api/equipment/utilization
 * Get equipment utilization metrics
 */
router.get('/utilization', authenticateToken, async (req, res) => {
  try {
    const { department_id, start_date, end_date } = req.query;

    let query = `
      SELECT 
        e.id,
        e.name,
        e.department_id,
        d.name as department_name,
        COUNT(er.id) as total_reservations,
        COUNT(CASE WHEN er.status = 'COMPLETED' THEN 1 END) as completed_reservations,
        SUM(EXTRACT(EPOCH FROM (er.end_time - er.start_time)) / 3600) as total_hours_reserved,
        AVG(EXTRACT(EPOCH FROM (er.end_time - er.start_time)) / 3600) as avg_hours_per_reservation
      FROM equipment e
      JOIN departments d ON e.department_id = d.id
      LEFT JOIN equipment_reservations er ON e.id = er.equipment_id
    `;
    const queryParams = [];
    let paramCount = 0;

    if (department_id) {
      paramCount++;
      query += ` WHERE e.department_id = $${paramCount}`;
      queryParams.push(department_id);
    }

    if (start_date) {
      paramCount++;
      query += ` ${paramCount === 1 ? 'WHERE' : 'AND'} er.reservation_date >= $${paramCount}`;
      queryParams.push(start_date);
    }

    if (end_date) {
      paramCount++;
      query += ` ${paramCount === 1 ? 'WHERE' : 'AND'} er.reservation_date <= $${paramCount}`;
      queryParams.push(end_date);
    }

    query += `
      GROUP BY e.id, e.name, e.department_id, d.name
      ORDER BY total_hours_reserved DESC NULLS LAST
    `;

    const result = await pool.query(query, queryParams);

    // Calculate utilization percentages and efficiency scores
    const utilizationData = result.rows.map(equipment => {
      const totalHours = parseFloat(equipment.total_hours_reserved) || 0;
      const utilizationPercentage = calculateEquipmentUtilization(totalHours);
      
      return {
        ...equipment,
        total_reservations: parseInt(equipment.total_reservations) || 0,
        completed_reservations: parseInt(equipment.completed_reservations) || 0,
        total_hours_reserved: totalHours,
        avg_hours_per_reservation: parseFloat(equipment.avg_hours_per_reservation) || 0,
        utilization_percentage: utilizationPercentage,
        efficiency_score: calculateEquipmentEfficiency(equipment)
      };
    });

    res.json({
      success: true,
      data: utilizationData,
      summary: {
        total_equipment: utilizationData.length,
        avg_utilization: utilizationData.reduce((sum, e) => sum + e.utilization_percentage, 0) / utilizationData.length,
        underutilized: utilizationData.filter(e => e.utilization_percentage < 30).length,
        well_utilized: utilizationData.filter(e => e.utilization_percentage >= 30 && e.utilization_percentage <= 70).length,
        overutilized: utilizationData.filter(e => e.utilization_percentage > 70).length
      }
    });

  } catch (error) {
    console.error('Equipment utilization error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch equipment utilization'
    });
  }
});

// Helper functions

function calculateEquipmentUtilization(totalHoursUsed) {
  // Assume equipment could be used up to 8 hours/day, 5 days/week, 15 weeks/semester
  const maxSemesterHours = 8 * 5 * 15; // 600 hours
  return Math.min((totalHoursUsed / maxSemesterHours) * 100, 100);
}

function calculateEquipmentEfficiency(equipment) {
  const reservationRate = equipment.total_reservations > 0 ? 
    (equipment.completed_reservations / equipment.total_reservations) * 100 : 0;
  
  const utilizationRate = calculateEquipmentUtilization(equipment.total_hours_reserved);
  
  // Balanced score considering both completion rate and utilization
  return (reservationRate * 0.4) + (utilizationRate * 0.6);
}

module.exports = router;
