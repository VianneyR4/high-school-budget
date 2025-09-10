const express = require('express');
const { body, query, validationResult } = require('express-validator');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const OptimizationAlgorithm = require('../models/OptimizationAlgorithm');
const ResourceAllocator = require('../models/ResourceAllocator');
const CostCalculator = require('../models/CostCalculator');

const router = express.Router();

// Initialize optimization services
const optimizer = new OptimizationAlgorithm();
const allocator = new ResourceAllocator();
const costCalculator = new CostCalculator();

/**
 * POST /api/optimize-allocation
 * Run optimization algorithm for resource allocation
 */
router.post('/optimize-allocation', [
  authenticateToken,
  body('strategy').optional().isIn(['cost_minimization', 'utilization_maximization', 'balanced', 'quality_focused']),
  body('constraints').optional().isObject(),
  body('department_id').optional().isInt(),
  body('semester').optional().isString(),
  body('academic_year').optional().isInt()
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

    const { strategy = 'balanced', constraints = {}, department_id, semester, academic_year } = req.body;

    // Build query filters
    let courseFilter = '';
    let resourceFilter = '';
    const queryParams = [];

    if (department_id) {
      courseFilter = 'WHERE c.department_id = $1';
      resourceFilter = 'WHERE department_id = $1';
      queryParams.push(department_id);
    }

    // Fetch courses
    const coursesQuery = `
      SELECT c.*, d.name as department_name
      FROM courses c
      JOIN departments d ON c.department_id = d.id
      ${courseFilter}
    `;
    const coursesResult = await pool.query(coursesQuery, queryParams);

    // Fetch instructors
    const instructorsQuery = `
      SELECT u.*, d.name as department_name
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      WHERE u.role IN ('TEACHER', 'DEPARTMENT_HEAD')
      ${resourceFilter ? 'AND u.' + resourceFilter : ''}
    `;
    const instructorsResult = await pool.query(instructorsQuery, queryParams);

    // Fetch facilities
    const facilitiesQuery = `
      SELECT f.*, d.name as department_name
      FROM facilities f
      LEFT JOIN departments d ON f.department_id = d.id
      WHERE f.status = 'AVAILABLE'
      ${resourceFilter ? 'AND f.' + resourceFilter : ''}
    `;
    const facilitiesResult = await pool.query(facilitiesQuery, queryParams);

    // Fetch equipment
    const equipmentQuery = `
      SELECT e.*, d.name as department_name
      FROM equipment e
      JOIN departments d ON e.department_id = d.id
      WHERE e.status = 'ACTIVE'
      ${resourceFilter ? 'AND e.' + resourceFilter : ''}
    `;
    const equipmentResult = await pool.query(equipmentQuery, queryParams);

    // Prepare data for optimization
    const resources = {
      instructors: instructorsResult.rows,
      facilities: facilitiesResult.rows,
      equipment: equipmentResult.rows
    };

    const courses = coursesResult.rows;

    // Fetch budget constraints
    const budgetQuery = `
      SELECT id, budget
      FROM departments
      ${department_id ? 'WHERE id = $1' : ''}
    `;
    const budgetResult = await pool.query(budgetQuery, department_id ? [department_id] : []);
    
    const budget = {};
    budgetResult.rows.forEach(dept => {
      budget[dept.id] = dept.budget;
    });

    // Run optimization
    const allocationPlan = await allocator.allocateResources(resources, courses, constraints, strategy);

    // Save optimization results
    const optimizationId = await saveOptimizationResults(allocationPlan, req.user.userId);

    res.json({
      success: true,
      message: 'Optimization completed successfully',
      data: {
        optimizationId,
        allocationPlan,
        summary: {
          totalCourses: courses.length,
          assignedCourses: allocationPlan.assignments.length,
          unassignedCourses: courses.length - allocationPlan.assignments.length,
          strategy: strategy,
          optimizationScore: allocationPlan.summary?.qualityMetrics?.averageQualityScore || 0
        }
      }
    });

  } catch (error) {
    console.error('Optimization error:', error);
    res.status(500).json({
      success: false,
      message: 'Optimization failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/instructors/availability
 * Check instructor availability for scheduling
 */
router.get('/instructors/availability', [
  authenticateToken,
  query('instructor_id').optional().isInt(),
  query('day_of_week').optional().isInt({ min: 0, max: 6 }),
  query('semester').optional().isString(),
  query('academic_year').optional().isInt()
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

    const { instructor_id, semester, academic_year, day_of_week } = req.query;

    let query = `
      SELECT ia.*, u.first_name, u.last_name, u.email
      FROM instructor_availability ia
      JOIN users u ON ia.instructor_id = u.id
      WHERE 1=1
    `;
    const queryParams = [];
    let paramCount = 0;

    if (instructor_id) {
      paramCount++;
      query += ` AND ia.instructor_id = $${paramCount}`;
      queryParams.push(instructor_id);
    }

    if (semester) {
      paramCount++;
      query += ` AND ia.semester = $${paramCount}`;
      queryParams.push(semester);
    }

    if (academic_year) {
      paramCount++;
      query += ` AND ia.academic_year = $${paramCount}`;
      queryParams.push(academic_year);
    }

    if (day_of_week) {
      paramCount++;
      query += ` AND ia.day_of_week = $${paramCount}`;
      queryParams.push(day_of_week);
    }

    query += ' ORDER BY ia.instructor_id, ia.day_of_week, ia.start_time';

    const result = await pool.query(query, queryParams);

    // Group availability by instructor
    const availabilityByInstructor = {};
    result.rows.forEach(row => {
      if (!availabilityByInstructor[row.instructor_id]) {
        availabilityByInstructor[row.instructor_id] = {
          instructor: {
            id: row.instructor_id,
            name: `${row.first_name} ${row.last_name}`,
            email: row.email
          },
          availability: []
        };
      }
      
      availabilityByInstructor[row.instructor_id].availability.push({
        id: row.id,
        day_of_week: row.day_of_week,
        start_time: row.start_time,
        end_time: row.end_time,
        semester: row.semester,
        academic_year: row.academic_year
      });
    });

    res.json({
      success: true,
      data: Object.values(availabilityByInstructor)
    });

  } catch (error) {
    console.error('Availability fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch instructor availability'
    });
  }
});

/**
 * POST /api/scenarios/calculate
 * Calculate different budget scenarios
 */
router.post('/scenarios/calculate', [
  authenticateToken,
  body('scenario_name').notEmpty().isString(),
  body('department_id').optional().isInt(),
  body('parameters').isObject(),
  body('time_horizon_months').optional().isInt({ min: 1, max: 60 })
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

    const { scenario_name, department_id, parameters, time_horizon_months } = req.body;

    // Fetch current department data for base scenario
    let departmentQuery = 'SELECT * FROM departments';
    let coursesQuery = 'SELECT * FROM courses';
    const queryParams = [];

    if (department_id) {
      departmentQuery += ' WHERE id = $1';
      coursesQuery += ' WHERE department_id = $1';
      queryParams.push(department_id);
    }

    const [departmentResult, coursesResult] = await Promise.all([
      pool.query(departmentQuery, queryParams),
      pool.query(coursesQuery, queryParams)
    ]);

    // Calculate base scenario costs
    const baseScenario = {
      totalCost: 0,
      instructorCosts: 0,
      facilityCosts: 0,
      equipmentCosts: 0,
      overheadCosts: 0
    };

    // Calculate costs for each course
    for (const course of coursesResult.rows) {
      const courseCost = (course.instructor_cost || 0) + (course.classroom_cost || 0);
      baseScenario.totalCost += courseCost;
      baseScenario.instructorCosts += course.instructor_cost || 0;
      baseScenario.facilityCosts += course.classroom_cost || 0;
    }

    // Add overhead (simplified calculation)
    baseScenario.overheadCosts = baseScenario.totalCost * 0.15; // 15% overhead
    baseScenario.totalCost += baseScenario.overheadCosts;

    // Generate scenario analysis
    const scenarioAnalysis = costCalculator.generateScenarioAnalysis(baseScenario, parameters);

    // Save scenario analysis
    const scenarioId = await saveScenarioAnalysis(scenarioAnalysis, req.user.userId, department_id);

    res.json({
      success: true,
      message: 'Scenario analysis completed',
      data: {
        scenarioId,
        analysis: scenarioAnalysis,
        departments: departmentResult.rows
      }
    });

  } catch (error) {
    console.error('Scenario calculation error:', error);
    res.status(500).json({
      success: false,
      message: 'Scenario calculation failed'
    });
  }
});

/**
 * GET /api/reports/utilization
 * Advanced utilization reports
 */
router.get('/reports/utilization', authenticateToken, async (req, res) => {
  try {
    const { department_id, start_date, end_date, metric_type } = req.query;

    // Fetch utilization metrics
    let query = `
      SELECT um.*, d.name as department_name
      FROM utilization_metrics um
      JOIN departments d ON um.department_id = d.id
      WHERE 1=1
    `;
    const queryParams = [];
    let paramCount = 0;

    if (department_id) {
      paramCount++;
      query += ` AND um.department_id = $${paramCount}`;
      queryParams.push(department_id);
    }

    if (start_date) {
      paramCount++;
      query += ` AND um.metric_date >= $${paramCount}`;
      queryParams.push(start_date);
    }

    if (end_date) {
      paramCount++;
      query += ` AND um.metric_date <= $${paramCount}`;
      queryParams.push(end_date);
    }

    if (metric_type) {
      paramCount++;
      query += ` AND um.metric_type = $${paramCount}`;
      queryParams.push(metric_type);
    }

    query += ' ORDER BY um.department_id, um.metric_date, um.metric_type';

    const metricsResult = await pool.query(query, queryParams);

    // Calculate current utilization from schedules
    const currentUtilizationQuery = `
      SELECT 
        c.department_id,
        d.name as department_name,
        COUNT(cs.id) as scheduled_courses,
        AVG(cs.enrollment_actual::float / f.capacity) as avg_facility_utilization,
        COUNT(DISTINCT cs.instructor_id) as active_instructors,
        COUNT(DISTINCT cs.facility_id) as active_facilities
      FROM course_schedules cs
      JOIN courses c ON cs.course_id = c.id
      JOIN departments d ON c.department_id = d.id
      LEFT JOIN facilities f ON cs.facility_id = f.id
      WHERE cs.status = 'ACTIVE'
      ${department_id ? 'AND c.department_id = $1' : ''}
      GROUP BY c.department_id, d.name
    `;

    const currentUtilizationResult = await pool.query(
      currentUtilizationQuery, 
      department_id ? [department_id] : []
    );

    // Process and format the data
    const utilizationReport = {
      historical: processHistoricalMetrics(metricsResult.rows),
      current: currentUtilizationResult.rows,
      summary: generateUtilizationSummary(metricsResult.rows, currentUtilizationResult.rows),
      trends: calculateUtilizationTrends(metricsResult.rows)
    };

    res.json({
      success: true,
      data: utilizationReport
    });

  } catch (error) {
    console.error('Utilization report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate utilization report'
    });
  }
});

/**
 * POST /api/schedules/generate
 * Generate course schedules with optimization
 */
router.post('/schedules/generate', [
  authenticateToken,
  body('department_id').optional().isInt(),
  body('semester').notEmpty().isString(),
  body('academic_year').notEmpty().isInt(),
  body('constraints').optional().isObject(),
  body('optimization_strategy').optional().isIn(['minimize_conflicts', 'maximize_utilization', 'balanced'])
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

    const { semester, academic_year, department_id, constraints = {} } = req.body;

    // Fetch courses that need scheduling
    let coursesQuery = `
      SELECT c.*, d.name as department_name
      FROM courses c
      JOIN departments d ON c.department_id = d.id
      WHERE NOT EXISTS (
        SELECT 1 FROM course_schedules cs 
        WHERE cs.course_id = c.id 
        AND cs.semester = $1 
        AND cs.academic_year = $2
        AND cs.status != 'CANCELLED'
      )
    `;
    const queryParams = [semester, academic_year];

    if (department_id) {
      coursesQuery += ' AND c.department_id = $3';
      queryParams.push(department_id);
    }

    const coursesResult = await pool.query(coursesQuery, queryParams);

    // Fetch available instructors
    const instructorsQuery = `
      SELECT u.*, ia.day_of_week, ia.start_time, ia.end_time
      FROM users u
      LEFT JOIN instructor_availability ia ON u.id = ia.instructor_id 
        AND ia.semester = $1 AND ia.academic_year = $2
      WHERE u.role IN ('TEACHER', 'DEPARTMENT_HEAD')
      ${department_id ? 'AND u.department_id = $3' : ''}
    `;
    const instructorsResult = await pool.query(instructorsQuery, queryParams);

    // Fetch available facilities
    const facilitiesQuery = `
      SELECT * FROM facilities 
      WHERE status = 'AVAILABLE'
      ${department_id ? 'AND department_id = $3' : ''}
    `;
    const facilitiesResult = await pool.query(facilitiesQuery, queryParams);

    // Generate schedules using optimization
    const resources = {
      instructors: instructorsResult.rows,
      facilities: facilitiesResult.rows
    };

    const scheduleOptimization = await optimizer.optimizeAllocation(
      resources, 
      coursesResult.rows, 
      { /* budget constraints */ }
    );

    // Save generated schedules
    const scheduleIds = [];
    for (const assignment of scheduleOptimization.courseAssignments) {
      const scheduleId = await saveScheduleAssignment(assignment, semester, academic_year);
      scheduleIds.push(scheduleId);
    }

    res.json({
      success: true,
      message: 'Schedules generated successfully',
      data: {
        scheduleIds,
        generatedSchedules: scheduleOptimization.courseAssignments.length,
        unscheduledCourses: coursesResult.rows.length - scheduleOptimization.courseAssignments.length,
        optimizationScore: scheduleOptimization.optimizationScore,
        warnings: scheduleOptimization.warnings,
        recommendations: scheduleOptimization.recommendations
      }
    });

  } catch (error) {
    console.error('Schedule generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Schedule generation failed'
    });
  }
});

// Helper functions

async function saveOptimizationResults(allocationPlan, userId) {
  const query = `
    INSERT INTO utilization_metrics (department_id, metric_type, metric_date, value, metadata)
    VALUES ($1, $2, CURRENT_DATE, $3, $4)
    RETURNING id
  `;
  
  const metadata = {
    strategy: allocationPlan.strategy,
    assignments: allocationPlan.assignments.length,
    optimizationScore: allocationPlan.summary?.qualityMetrics?.averageQualityScore || 0,
    createdBy: userId
  };

  const result = await pool.query(query, [
    1, // Default department for now
    'OPTIMIZATION_RESULT',
    allocationPlan.summary?.qualityMetrics?.averageQualityScore || 0,
    JSON.stringify(metadata)
  ]);

  return result.rows[0].id;
}

async function saveScenarioAnalysis(analysis, userId, departmentId) {
  const query = `
    INSERT INTO budget_forecasts (department_id, scenario_name, forecast_type, academic_year, 
                                 projected_expenses, assumptions, created_by)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING id
  `;

  const result = await pool.query(query, [
    departmentId || 1,
    'Multi-Scenario Analysis',
    'CUSTOM',
    new Date().getFullYear(),
    analysis.scenarios.base.totalCost,
    JSON.stringify(analysis),
    userId
  ]);

  return result.rows[0].id;
}

async function saveScheduleAssignment(assignment, semester, academicYear) {
  const query = `
    INSERT INTO course_schedules (course_id, instructor_id, facility_id, semester, academic_year,
                                 day_of_week, start_time, end_time, status)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'SCHEDULED')
    RETURNING id
  `;

  // Generate default time slot (would be more sophisticated in practice)
  const timeSlot = assignment.timeSlot || { day: 1, startTime: '10:00', endTime: '11:00' };

  const result = await pool.query(query, [
    assignment.courseId,
    assignment.instructorId,
    assignment.facilityId,
    semester,
    academicYear,
    timeSlot.day,
    timeSlot.startTime,
    timeSlot.endTime
  ]);

  return result.rows[0].id;
}

function processHistoricalMetrics(metrics) {
  const processed = {};
  
  metrics.forEach(metric => {
    const key = `${metric.department_id}_${metric.metric_type}`;
    if (!processed[key]) {
      processed[key] = {
        department: metric.department_name,
        metricType: metric.metric_type,
        data: []
      };
    }
    
    processed[key].data.push({
      date: metric.metric_date,
      value: metric.value,
      metadata: metric.metadata
    });
  });

  return Object.values(processed);
}

function generateUtilizationSummary(historical, current) {
  const summary = {
    totalDepartments: current.length,
    avgFacilityUtilization: 0,
    totalActiveInstructors: 0,
    totalActiveFacilities: 0,
    utilizationTrend: 'stable'
  };

  if (current.length > 0) {
    summary.avgFacilityUtilization = current.reduce((sum, dept) => 
      sum + (parseFloat(dept.avg_facility_utilization) || 0), 0) / current.length;
    
    summary.totalActiveInstructors = current.reduce((sum, dept) => 
      sum + parseInt(dept.active_instructors), 0);
    
    summary.totalActiveFacilities = current.reduce((sum, dept) => 
      sum + parseInt(dept.active_facilities), 0);
  }

  return summary;
}

function calculateUtilizationTrends(metrics) {
  const trends = {};
  
  // Group metrics by type and calculate trends
  metrics.forEach(metric => {
    if (!trends[metric.metric_type]) {
      trends[metric.metric_type] = [];
    }
    trends[metric.metric_type].push({
      date: metric.metric_date,
      value: metric.value
    });
  });

  // Calculate trend direction for each metric type
  Object.keys(trends).forEach(metricType => {
    const data = trends[metricType].sort((a, b) => new Date(a.date) - new Date(b.date));
    if (data.length >= 2) {
      const recent = data.slice(-3); // Last 3 data points
      const avgRecent = recent.reduce((sum, point) => sum + point.value, 0) / recent.length;
      const older = data.slice(0, -3);
      const avgOlder = older.length > 0 ? 
        older.reduce((sum, point) => sum + point.value, 0) / older.length : avgRecent;
      
      trends[metricType] = {
        direction: avgRecent > avgOlder ? 'increasing' : avgRecent < avgOlder ? 'decreasing' : 'stable',
        change: ((avgRecent - avgOlder) / avgOlder * 100).toFixed(2) + '%',
        data: data
      };
    }
  });

  return trends;
}

module.exports = router;
