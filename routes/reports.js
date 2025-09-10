const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { Parser } = require('json2csv');
const PDFDocument = require('pdfkit');

const CostCalculator = require('../models/CostCalculator');

const router = express.Router();
const costCalculator = new CostCalculator();

/**
 * GET /api/reports/budget-variance
 * Generate budget variance analysis report
 */
router.get('/budget-variance', authenticateToken, async (req, res) => {
  try {
    const { department_id, start_date, end_date, format = 'json' } = req.query;

    let query = `
      SELECT 
        bv.*,
        d.name as department_name
      FROM budget_variances bv
      JOIN departments d ON bv.department_id = d.id
      WHERE 1=1
    `;
    const queryParams = [];
    let paramCount = 0;

    if (department_id) {
      paramCount++;
      query += ` AND bv.department_id = $${paramCount}`;
      queryParams.push(department_id);
    }

    if (start_date) {
      paramCount++;
      query += ` AND bv.period_start >= $${paramCount}`;
      queryParams.push(start_date);
    }

    if (end_date) {
      paramCount++;
      query += ` AND bv.period_end <= $${paramCount}`;
      queryParams.push(end_date);
    }

    query += ' ORDER BY bv.department_id, bv.period_start DESC';

    const result = await pool.query(query, queryParams);

    // Calculate summary statistics
    const summary = {
      total_variances: result.rows.length,
      favorable_variances: result.rows.filter(v => v.variance_amount < 0).length,
      unfavorable_variances: result.rows.filter(v => v.variance_amount > 0).length,
      total_variance_amount: result.rows.reduce((sum, v) => sum + parseFloat(v.variance_amount), 0),
      avg_variance_percentage: result.rows.length > 0 ? 
        result.rows.reduce((sum, v) => sum + parseFloat(v.variance_percentage), 0) / result.rows.length : 0
    };

    // Group by department
    const byDepartment = result.rows.reduce((acc, variance) => {
      if (!acc[variance.department_name]) {
        acc[variance.department_name] = {
          variances: [],
          total_variance: 0,
          avg_variance_percentage: 0
        };
      }
      acc[variance.department_name].variances.push(variance);
      acc[variance.department_name].total_variance += parseFloat(variance.variance_amount);
      return acc;
    }, {});

    // Calculate averages for each department
    Object.keys(byDepartment).forEach(dept => {
      const variances = byDepartment[dept].variances;
      byDepartment[dept].avg_variance_percentage = variances.length > 0 ?
        variances.reduce((sum, v) => sum + parseFloat(v.variance_percentage), 0) / variances.length : 0;
    });

    const reportData = {
      variances: result.rows,
      summary,
      by_department: byDepartment,
      generated_at: new Date().toISOString()
    };

    if (format === 'csv') {
      const fields = [
        'department_name', 'budget_category', 'budgeted_amount', 'actual_amount',
        'variance_amount', 'variance_percentage', 'period_start', 'period_end'
      ];
      const json2csvParser = new Parser({ fields });
      const csv = json2csvParser.parse(result.rows);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="budget_variance_report.csv"');
      return res.send(csv);
    }

    res.json({
      success: true,
      data: reportData
    });

  } catch (error) {
    console.error('Budget variance report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate budget variance report'
    });
  }
});

/**
 * GET /api/reports/cost-analysis
 * Generate comprehensive cost analysis report
 */
router.get('/cost-analysis', authenticateToken, async (req, res) => {
  try {
    const { department_id, semester, academic_year, format = 'json' } = req.query;

    // Fetch courses with cost data
    let coursesQuery = `
      SELECT 
        c.*,
        d.name as department_name,
        cs.enrollment_actual,
        u.first_name || ' ' || u.last_name as instructor_name,
        u.employment_type,
        f.name as facility_name,
        f.type as facility_type
      FROM courses c
      JOIN departments d ON c.department_id = d.id
      LEFT JOIN course_schedules cs ON c.id = cs.course_id
      LEFT JOIN users u ON cs.instructor_id = u.id
      LEFT JOIN facilities f ON cs.facility_id = f.id
      WHERE 1=1
    `;
    const queryParams = [];
    let paramCount = 0;

    if (department_id) {
      paramCount++;
      coursesQuery += ` AND c.department_id = $${paramCount}`;
      queryParams.push(department_id);
    }

    if (semester) {
      paramCount++;
      coursesQuery += ` AND cs.semester = $${paramCount}`;
      queryParams.push(semester);
    }

    if (academic_year) {
      paramCount++;
      coursesQuery += ` AND cs.academic_year = $${paramCount}`;
      queryParams.push(academic_year);
    }

    const coursesResult = await pool.query(coursesQuery, queryParams);

    // Calculate detailed costs for each course
    const costAnalysis = coursesResult.rows.map(course => {
      const instructor = {
        employment_type: course.employment_type,
        hourly_rate: 50 // Default rate
      };

      const facility = {
        hourly_cost: 25, // Default rate
        utilities_cost_annual: 5000,
        maintenance_cost_annual: 2000
      };

      const comprehensiveCost = costCalculator.calculateComprehensiveCost(
        course, instructor, facility, []
      );

      return {
        course_id: course.id,
        course_name: course.name,
        department: course.department_name,
        expected_students: course.expected_students,
        actual_enrollment: course.enrollment_actual || course.expected_students,
        instructor_name: course.instructor_name,
        facility_name: course.facility_name,
        cost_breakdown: comprehensiveCost,
        cost_per_student: comprehensiveCost.costPerStudent,
        cost_per_credit_hour: comprehensiveCost.costPerCreditHour
      };
    });

    // Calculate summary statistics
    const summary = {
      total_courses: costAnalysis.length,
      total_cost: costAnalysis.reduce((sum, c) => sum + c.cost_breakdown.totalCost, 0),
      avg_cost_per_course: costAnalysis.length > 0 ? 
        costAnalysis.reduce((sum, c) => sum + c.cost_breakdown.totalCost, 0) / costAnalysis.length : 0,
      avg_cost_per_student: costAnalysis.length > 0 ?
        costAnalysis.reduce((sum, c) => sum + c.cost_per_student, 0) / costAnalysis.length : 0,
      total_students: costAnalysis.reduce((sum, c) => sum + (c.actual_enrollment || 0), 0)
    };

    // Cost distribution analysis
    const costDistribution = {
      instructor_costs: costAnalysis.reduce((sum, c) => sum + c.cost_breakdown.instructorCosts.total, 0),
      facility_costs: costAnalysis.reduce((sum, c) => sum + c.cost_breakdown.facilityCosts.total, 0),
      equipment_costs: costAnalysis.reduce((sum, c) => sum + c.cost_breakdown.equipmentCosts.total, 0),
      overhead_costs: costAnalysis.reduce((sum, c) => sum + c.cost_breakdown.overheadCosts.total, 0)
    };

    const reportData = {
      cost_analysis: costAnalysis,
      summary,
      cost_distribution: costDistribution,
      generated_at: new Date().toISOString()
    };

    if (format === 'csv') {
      const flattenedData = costAnalysis.map(course => ({
        course_name: course.course_name,
        department: course.department,
        expected_students: course.expected_students,
        actual_enrollment: course.actual_enrollment,
        total_cost: course.cost_breakdown.totalCost,
        instructor_cost: course.cost_breakdown.instructorCosts.total,
        facility_cost: course.cost_breakdown.facilityCosts.total,
        equipment_cost: course.cost_breakdown.equipmentCosts.total,
        overhead_cost: course.cost_breakdown.overheadCosts.total,
        cost_per_student: course.cost_per_student,
        cost_per_credit_hour: course.cost_per_credit_hour
      }));

      const fields = Object.keys(flattenedData[0] || {});
      const json2csvParser = new Parser({ fields });
      const csv = json2csvParser.parse(flattenedData);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="cost_analysis_report.csv"');
      return res.send(csv);
    }

    res.json({
      success: true,
      data: reportData
    });

  } catch (error) {
    console.error('Cost analysis report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate cost analysis report'
    });
  }
});

/**
 * GET /api/reports/utilization-dashboard
 * Generate comprehensive utilization dashboard
 */
router.get('/utilization-dashboard', authenticateToken, async (req, res) => {
  try {
    const { department_id } = req.query;

    // Instructor utilization
    let instructorQuery = `
      SELECT 
        u.id,
        u.first_name || ' ' || u.last_name as name,
        u.employment_type,
        d.name as department_name,
        COUNT(cs.id) as courses_assigned,
        SUM(EXTRACT(EPOCH FROM (cs.end_time - cs.start_time)) / 3600) as total_hours
      FROM users u
      JOIN departments d ON u.department_id = d.id
      LEFT JOIN course_schedules cs ON u.id = cs.instructor_id AND cs.status = 'ACTIVE'
      WHERE u.role IN ('TEACHER', 'DEPARTMENT_HEAD')
    `;

    if (department_id) {
      instructorQuery += ' AND u.department_id = $1';
    }

    instructorQuery += ' GROUP BY u.id, u.first_name, u.last_name, u.employment_type, d.name';

    const instructorResult = await pool.query(
      instructorQuery, 
      department_id ? [department_id] : []
    );

    // Facility utilization
    let facilityQuery = `
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

    if (department_id) {
      facilityQuery += ' AND f.department_id = $1';
    }

    facilityQuery += ' GROUP BY f.id, f.name, f.type, f.capacity, d.name';

    const facilityResult = await pool.query(
      facilityQuery,
      department_id ? [department_id] : []
    );

    // Equipment utilization
    let equipmentQuery = `
      SELECT 
        e.id,
        e.name,
        e.status,
        d.name as department_name,
        COUNT(er.id) as total_reservations,
        SUM(EXTRACT(EPOCH FROM (er.end_time - er.start_time)) / 3600) as total_hours_reserved
      FROM equipment e
      JOIN departments d ON e.department_id = d.id
      LEFT JOIN equipment_reservations er ON e.id = er.equipment_id
      WHERE e.status = 'ACTIVE'
    `;

    if (department_id) {
      equipmentQuery += ' AND e.department_id = $1';
    }

    equipmentQuery += ' GROUP BY e.id, e.name, e.status, d.name';

    const equipmentResult = await pool.query(
      equipmentQuery,
      department_id ? [department_id] : []
    );

    // Calculate utilization percentages
    const instructorUtilization = instructorResult.rows.map(instructor => ({
      ...instructor,
      courses_assigned: parseInt(instructor.courses_assigned) || 0,
      total_hours: parseFloat(instructor.total_hours) || 0,
      utilization_percentage: calculateInstructorUtilization(instructor.total_hours, instructor.employment_type)
    }));

    const facilityUtilization = facilityResult.rows.map(facility => ({
      ...facility,
      scheduled_sessions: parseInt(facility.scheduled_sessions) || 0,
      avg_capacity_utilization: parseFloat(facility.avg_capacity_utilization) || 0,
      total_hours_used: parseFloat(facility.total_hours_used) || 0,
      utilization_percentage: calculateFacilityUtilization(facility.total_hours_used)
    }));

    const equipmentUtilization = equipmentResult.rows.map(equipment => ({
      ...equipment,
      total_reservations: parseInt(equipment.total_reservations) || 0,
      total_hours_reserved: parseFloat(equipment.total_hours_reserved) || 0,
      utilization_percentage: calculateEquipmentUtilization(equipment.total_hours_reserved)
    }));

    // Overall summary
    const summary = {
      instructors: {
        total: instructorUtilization.length,
        avg_utilization: instructorUtilization.reduce((sum, i) => sum + i.utilization_percentage, 0) / instructorUtilization.length || 0,
        underutilized: instructorUtilization.filter(i => i.utilization_percentage < 50).length,
        well_utilized: instructorUtilization.filter(i => i.utilization_percentage >= 50 && i.utilization_percentage <= 80).length,
        overutilized: instructorUtilization.filter(i => i.utilization_percentage > 80).length
      },
      facilities: {
        total: facilityUtilization.length,
        avg_utilization: facilityUtilization.reduce((sum, f) => sum + f.utilization_percentage, 0) / facilityUtilization.length || 0,
        underutilized: facilityUtilization.filter(f => f.utilization_percentage < 40).length,
        well_utilized: facilityUtilization.filter(f => f.utilization_percentage >= 40 && f.utilization_percentage <= 80).length,
        overutilized: facilityUtilization.filter(f => f.utilization_percentage > 80).length
      },
      equipment: {
        total: equipmentUtilization.length,
        avg_utilization: equipmentUtilization.reduce((sum, e) => sum + e.utilization_percentage, 0) / equipmentUtilization.length || 0,
        underutilized: equipmentUtilization.filter(e => e.utilization_percentage < 30).length,
        well_utilized: equipmentUtilization.filter(e => e.utilization_percentage >= 30 && e.utilization_percentage <= 70).length,
        overutilized: equipmentUtilization.filter(e => e.utilization_percentage > 70).length
      }
    };

    res.json({
      success: true,
      data: {
        instructors: instructorUtilization,
        facilities: facilityUtilization,
        equipment: equipmentUtilization,
        summary,
        generated_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Utilization dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate utilization dashboard'
    });
  }
});

/**
 * GET /api/reports/financial-summary
 * Generate comprehensive financial summary report
 */
router.get('/financial-summary', authenticateToken, async (req, res) => {
  try {
    const { department_id, academic_year, format = 'json' } = req.query;

    // Department budgets and spending
    let departmentQuery = `
      SELECT 
        d.*,
        COALESCE(SUM(c.total_cost), 0) as total_course_costs,
        COALESCE(SUM(t_out.amount), 0) as transfers_out,
        COALESCE(SUM(t_in.amount), 0) as transfers_in,
        d.budget + COALESCE(SUM(t_in.amount), 0) - COALESCE(SUM(t_out.amount), 0) as adjusted_budget
      FROM departments d
      LEFT JOIN courses c ON d.id = c.department_id
      LEFT JOIN transfers t_out ON d.id = t_out.from_department_id
      LEFT JOIN transfers t_in ON d.id = t_in.to_department_id
    `;

    if (department_id) {
      departmentQuery += ' WHERE d.id = $1';
    }

    departmentQuery += ' GROUP BY d.id, d.name, d.budget ORDER BY d.name';

    const departmentResult = await pool.query(
      departmentQuery,
      department_id ? [department_id] : []
    );

    // Equipment depreciation summary
    let equipmentQuery = `
      SELECT 
        d.name as department_name,
        COUNT(e.id) as equipment_count,
        SUM(e.purchase_cost) as total_purchase_cost,
        SUM(e.current_value) as total_current_value,
        SUM(e.maintenance_cost_annual) as total_maintenance_cost
      FROM equipment e
      JOIN departments d ON e.department_id = d.id
      WHERE e.status != 'RETIRED'
    `;

    if (department_id) {
      equipmentQuery += ' AND e.department_id = $1';
    }

    equipmentQuery += ' GROUP BY d.name ORDER BY d.name';

    const equipmentResult = await pool.query(
      equipmentQuery,
      department_id ? [department_id] : []
    );

    // Budget forecasts
    let forecastQuery = `
      SELECT 
        bf.*,
        d.name as department_name
      FROM budget_forecasts bf
      JOIN departments d ON bf.department_id = d.id
      WHERE 1=1
    `;
    const forecastParams = [];
    let paramCount = 0;

    if (department_id) {
      paramCount++;
      forecastQuery += ` AND bf.department_id = $${paramCount}`;
      forecastParams.push(department_id);
    }

    if (academic_year) {
      paramCount++;
      forecastQuery += ` AND bf.academic_year = $${paramCount}`;
      forecastParams.push(academic_year);
    }

    forecastQuery += ' ORDER BY bf.department_id, bf.created_at DESC';

    const forecastResult = await pool.query(forecastQuery, forecastParams);

    // Calculate financial metrics
    const financialSummary = departmentResult.rows.map(dept => {
      const equipment = equipmentResult.rows.find(e => e.department_name === dept.name) || {};
      const forecasts = forecastResult.rows.filter(f => f.department_id === dept.id);

      const budgetUtilization = dept.adjusted_budget > 0 ? 
        (dept.total_course_costs / dept.adjusted_budget) * 100 : 0;

      const equipmentDepreciation = (equipment.total_purchase_cost || 0) - (equipment.total_current_value || 0);

      return {
        department_id: dept.id,
        department_name: dept.name,
        original_budget: parseFloat(dept.budget),
        transfers_in: parseFloat(dept.transfers_in) || 0,
        transfers_out: parseFloat(dept.transfers_out) || 0,
        adjusted_budget: parseFloat(dept.adjusted_budget),
        total_spending: parseFloat(dept.total_course_costs),
        remaining_budget: parseFloat(dept.adjusted_budget) - parseFloat(dept.total_course_costs),
        budget_utilization_percentage: budgetUtilization,
        equipment_count: parseInt(equipment.equipment_count) || 0,
        equipment_value: parseFloat(equipment.total_current_value) || 0,
        equipment_depreciation: equipmentDepreciation,
        annual_maintenance_cost: parseFloat(equipment.total_maintenance_cost) || 0,
        forecasts: forecasts.length
      };
    });

    // Overall totals
    const totals = {
      total_budget: financialSummary.reduce((sum, d) => sum + d.adjusted_budget, 0),
      total_spending: financialSummary.reduce((sum, d) => sum + d.total_spending, 0),
      total_remaining: financialSummary.reduce((sum, d) => sum + d.remaining_budget, 0),
      total_equipment_value: financialSummary.reduce((sum, d) => sum + d.equipment_value, 0),
      total_depreciation: financialSummary.reduce((sum, d) => sum + d.equipment_depreciation, 0),
      avg_budget_utilization: financialSummary.length > 0 ?
        financialSummary.reduce((sum, d) => sum + d.budget_utilization_percentage, 0) / financialSummary.length : 0
    };

    const reportData = {
      departments: financialSummary,
      totals,
      generated_at: new Date().toISOString()
    };

    if (format === 'pdf') {
      return generatePDFReport(res, reportData, 'Financial Summary Report');
    }

    if (format === 'csv') {
      const fields = [
        'department_name', 'original_budget', 'adjusted_budget', 'total_spending',
        'remaining_budget', 'budget_utilization_percentage', 'equipment_count',
        'equipment_value', 'equipment_depreciation', 'annual_maintenance_cost'
      ];
      const json2csvParser = new Parser({ fields });
      const csv = json2csvParser.parse(financialSummary);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="financial_summary_report.csv"');
      return res.send(csv);
    }

    res.json({
      success: true,
      data: reportData
    });

  } catch (error) {
    console.error('Financial summary report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate financial summary report'
    });
  }
});

// Helper functions

function calculateInstructorUtilization(totalHours, employmentType) {
  let maxHours;
  switch (employmentType) {
    case 'FULL_TIME': maxHours = 40 * 15; break; // 40 hours/week * 15 weeks
    case 'PART_TIME': maxHours = 20 * 15; break; // 20 hours/week * 15 weeks
    case 'ADJUNCT': maxHours = 12 * 15; break; // 12 hours/week * 15 weeks
    default: maxHours = 40 * 15;
  }
  return Math.min((totalHours / maxHours) * 100, 100);
}

function calculateFacilityUtilization(totalHours) {
  const maxHours = 50 * 15; // 50 hours/week * 15 weeks
  return Math.min((totalHours / maxHours) * 100, 100);
}

function calculateEquipmentUtilization(totalHours) {
  const maxHours = 40 * 15; // 40 hours/week * 15 weeks
  return Math.min((totalHours / maxHours) * 100, 100);
}

function generatePDFReport(res, data, title) {
  const doc = new PDFDocument();
  
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${title.toLowerCase().replace(/\s+/g, '_')}.pdf"`);
  
  doc.pipe(res);
  
  // Title
  doc.fontSize(20).text(title, 50, 50);
  doc.fontSize(12).text(`Generated: ${new Date().toLocaleDateString()}`, 50, 80);
  
  // Add content based on report type
  let yPosition = 120;
  
  if (data.departments) {
    doc.fontSize(16).text('Department Summary', 50, yPosition);
    yPosition += 30;
    
    data.departments.forEach(dept => {
      doc.fontSize(12)
         .text(`${dept.department_name}:`, 50, yPosition)
         .text(`Budget: $${dept.adjusted_budget.toLocaleString()}`, 200, yPosition)
         .text(`Spending: $${dept.total_spending.toLocaleString()}`, 350, yPosition)
         .text(`Utilization: ${dept.budget_utilization_percentage.toFixed(1)}%`, 500, yPosition);
      yPosition += 20;
    });
  }
  
  doc.end();
}

module.exports = router;
