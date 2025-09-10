const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/facilities
 * Get all facilities with filtering options
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { department_id, type, status, capacity_min, capacity_max } = req.query;

    let query = `
      SELECT f.*, d.name as department_name
      FROM facilities f
      LEFT JOIN departments d ON f.department_id = d.id
      WHERE 1=1
    `;
    const queryParams = [];
    let paramCount = 0;

    if (department_id) {
      paramCount++;
      query += ` AND f.department_id = $${paramCount}`;
      queryParams.push(department_id);
    }

    if (type) {
      paramCount++;
      query += ` AND f.type = $${paramCount}`;
      queryParams.push(type);
    }

    if (status) {
      paramCount++;
      query += ` AND f.status = $${paramCount}`;
      queryParams.push(status);
    }

    if (capacity_min) {
      paramCount++;
      query += ` AND f.capacity >= $${paramCount}`;
      queryParams.push(capacity_min);
    }

    if (capacity_max) {
      paramCount++;
      query += ` AND f.capacity <= $${paramCount}`;
      queryParams.push(capacity_max);
    }

    query += ' ORDER BY f.name';

    const result = await pool.query(query, queryParams);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Facilities fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch facilities'
    });
  }
});

/**
 * POST /api/facilities
 * Create a new facility
 */
router.post('/', [
  authenticateToken,
  body('name').notEmpty().isString(),
  body('type').notEmpty().isIn(['CLASSROOM', 'LAB', 'AUDITORIUM', 'LIBRARY', 'GYM', 'OFFICE']),
  body('capacity').isInt({ min: 1 }),
  body('hourly_cost').isFloat({ min: 0 }),
  body('metadata').optional().isObject(),
  body('utilities_cost_annual').optional().isFloat({ min: 0 }),
  body('department_id').optional().isInt()
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
      type,
      capacity,
      hourly_cost = 0,
      metadata = {},
      utilities_cost_annual = 0,
      department_id,
      equipment_ids = [],
      status = 'AVAILABLE'
    } = req.body;

    const query = `
      INSERT INTO facilities (name, type, capacity, hourly_cost, metadata, 
                           utilities_cost_annual, department_id, equipment_ids, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const result = await pool.query(query, [
      name, type, capacity, hourly_cost, metadata, utilities_cost_annual, department_id, equipment_ids, status
    ]);

    res.status(201).json({
      success: true,
      message: 'Facility created successfully',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Facility creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create facility'
    });
  }
});

/**
 * GET /api/facilities/:id/availability
 * Get facility availability for scheduling
 */
router.get('/:id/availability', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { semester, academic_year, start_date, end_date } = req.query;

    // Get facility details
    const facilityQuery = 'SELECT * FROM facilities WHERE id = $1';
    const facilityResult = await pool.query(facilityQuery, [id]);

    if (facilityResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Facility not found'
      });
    }

    // Get scheduled time slots
    let schedulesQuery = `
      SELECT cs.*, c.name as course_name
      FROM course_schedules cs
      JOIN courses c ON cs.course_id = c.id
      WHERE cs.facility_id = $1 AND cs.status != 'CANCELLED'
    `;
    const queryParams = [id];
    let paramCount = 1;

    if (semester) {
      paramCount++;
      schedulesQuery += ` AND cs.semester = $${paramCount}`;
      queryParams.push(semester);
    }

    if (academic_year) {
      paramCount++;
      schedulesQuery += ` AND cs.academic_year = $${paramCount}`;
      queryParams.push(academic_year);
    }

    schedulesQuery += ' ORDER BY cs.day_of_week, cs.start_time';

    const schedulesResult = await pool.query(schedulesQuery, queryParams);

    // Calculate availability
    const availability = calculateFacilityAvailability(schedulesResult.rows);

    res.json({
      success: true,
      data: {
        facility: facilityResult.rows[0],
        scheduledSlots: schedulesResult.rows,
        availability: availability
      }
    });

  } catch (error) {
    console.error('Facility availability error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch facility availability'
    });
  }
});

/**
 * POST /api/facilities/:id/reserve
 * Reserve facility for equipment or special use
 */
router.post('/:id/reserve', [
  authenticateToken,
  body('start_datetime').isISO8601(),
  body('end_datetime').isISO8601(),
  body('purpose').notEmpty().isString(),
  body('course_id').optional().isInt()
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
    const { reservation_date, start_time, end_time, purpose, equipment_ids = [] } = req.body;

    // Check for conflicts
    const conflictQuery = `
      SELECT COUNT(*) as conflicts
      FROM course_schedules
      WHERE facility_id = $1 
      AND DATE(reservation_date) = $2
      AND (
        (start_time <= $3 AND end_time > $3) OR
        (start_time < $4 AND end_time >= $4) OR
        (start_time >= $3 AND end_time <= $4)
      )
      AND status != 'CANCELLED'
    `;

    const conflictResult = await pool.query(conflictQuery, [
      id, reservation_date, start_time, end_time
    ]);

    if (parseInt(conflictResult.rows[0].conflicts) > 0) {
      return res.status(409).json({
        success: false,
        message: 'Time slot conflicts with existing schedule'
      });
    }

    // Create reservation (using equipment_reservations table as proxy)
    const reservationQuery = `
      INSERT INTO equipment_reservations (equipment_id, reserved_by, reservation_date, 
                                        start_time, end_time, purpose, status)
      VALUES ($1, $2, $3, $4, $5, $6, 'RESERVED')
      RETURNING *
    `;

    // Use facility_id as equipment_id for facility reservations
    const result = await pool.query(reservationQuery, [
      id, req.user.userId, reservation_date, start_time, end_time, purpose
    ]);

    res.status(201).json({
      success: true,
      message: 'Facility reserved successfully',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Facility reservation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reserve facility'
    });
  }
});

/**
 * GET /api/facilities/utilization
 * Get facility utilization metrics
 */
router.get('/utilization', authenticateToken, async (req, res) => {
  try {
    const { department_id, start_date, end_date } = req.query;

    let query = `
      SELECT 
        f.id,
        f.name,
        f.type,
        f.capacity,
        d.name as department_name,
        COUNT(cs.id) as scheduled_sessions,
        AVG(cs.enrollment_actual::float / f.capacity) as avg_capacity_utilization,
        SUM(EXTRACT(EPOCH FROM (cs.end_time - cs.start_time)) / 3600) as total_hours_used
      FROM facilities f
      LEFT JOIN departments d ON f.department_id = d.id
      LEFT JOIN course_schedules cs ON f.id = cs.facility_id AND cs.status = 'ACTIVE'
      WHERE f.status = 'AVAILABLE'
    `;
    const queryParams = [];
    let paramCount = 0;

    if (department_id) {
      paramCount++;
      query += ` AND f.department_id = $${paramCount}`;
      queryParams.push(department_id);
    }

    query += `
      GROUP BY f.id, f.name, f.type, f.capacity, d.name
      ORDER BY avg_capacity_utilization DESC NULLS LAST
    `;

    const result = await pool.query(query, queryParams);

    // Calculate utilization percentages
    const utilizationData = result.rows.map(facility => ({
      ...facility,
      avg_capacity_utilization: parseFloat(facility.avg_capacity_utilization) || 0,
      total_hours_used: parseFloat(facility.total_hours_used) || 0,
      utilization_percentage: calculateUtilizationPercentage(facility.total_hours_used),
      efficiency_score: calculateEfficiencyScore(facility.avg_capacity_utilization, facility.total_hours_used)
    }));

    res.json({
      success: true,
      data: utilizationData,
      summary: {
        totalFacilities: utilizationData.length,
        avgUtilization: utilizationData.reduce((sum, f) => sum + f.utilization_percentage, 0) / utilizationData.length,
        underutilized: utilizationData.filter(f => f.utilization_percentage < 50).length,
        overutilized: utilizationData.filter(f => f.utilization_percentage > 90).length
      }
    });

  } catch (error) {
    console.error('Facility utilization error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch facility utilization'
    });
  }
});

/**
 * PUT /api/facilities/:id
 * Update facility information
 */
router.put('/:id', [
  authenticateToken,
  body('name').optional().notEmpty().trim(),
  body('type').optional().isIn(['CLASSROOM', 'LAB', 'AUDITORIUM', 'GYM', 'LIBRARY', 'OFFICE']),
  body('capacity').optional().isInt({ min: 1 }),
  body('status').optional().isIn(['AVAILABLE', 'MAINTENANCE', 'UNAVAILABLE'])
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
    const updates = req.body;

    // Build dynamic update query
    const setClause = [];
    const queryParams = [];
    let paramCount = 0;

    Object.keys(updates).forEach(key => {
      if (updates[key] !== undefined) {
        paramCount++;
        setClause.push(`${key} = $${paramCount}`);
        queryParams.push(updates[key]);
      }
    });

    if (setClause.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields to update'
      });
    }

    paramCount++;
    queryParams.push(id);

    const query = `
      UPDATE facilities 
      SET ${setClause.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, queryParams);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Facility not found'
      });
    }

    res.json({
      success: true,
      message: 'Facility updated successfully',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Facility update error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update facility'
    });
  }
});

// Helper functions

function calculateFacilityAvailability(scheduledSlots) {
  const availability = {
    Monday: generateDaySlots(),
    Tuesday: generateDaySlots(),
    Wednesday: generateDaySlots(),
    Thursday: generateDaySlots(),
    Friday: generateDaySlots()
  };

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  scheduledSlots.forEach(slot => {
    const dayName = dayNames[slot.day_of_week];
    if (availability[dayName]) {
      markSlotAsOccupied(availability[dayName], slot.start_time, slot.end_time);
    }
  });

  return availability;
}

function generateDaySlots() {
  const slots = [];
  for (let hour = 8; hour <= 17; hour++) {
    slots.push({
      time: `${hour.toString().padStart(2, '0')}:00`,
      available: true,
      course: null
    });
  }
  return slots;
}

function markSlotAsOccupied(daySlots, startTime, endTime) {
  const startHour = parseInt(startTime.split(':')[0]);
  const endHour = parseInt(endTime.split(':')[0]);

  for (let hour = startHour; hour < endHour; hour++) {
    const slotIndex = hour - 8; // Slots start at 8 AM
    if (slotIndex >= 0 && slotIndex < daySlots.length) {
      daySlots[slotIndex].available = false;
    }
  }
}

function calculateUtilizationPercentage(totalHoursUsed) {
  const maxWeeklyHours = 50; // 10 hours/day * 5 days
  const semesterWeeks = 15;
  const maxSemesterHours = maxWeeklyHours * semesterWeeks;
  
  return Math.min((totalHoursUsed / maxSemesterHours) * 100, 100);
}

function calculateEfficiencyScore(capacityUtilization, hoursUsed) {
  const capacityScore = Math.min(capacityUtilization * 100, 100);
  const utilizationScore = calculateUtilizationPercentage(hoursUsed);
  
  // Balanced score considering both capacity and time utilization
  return (capacityScore * 0.6) + (utilizationScore * 0.4);
}

module.exports = router;
