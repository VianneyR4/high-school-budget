const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const CostCalculator = require('../models/CostCalculator');

const router = express.Router();
const costCalculator = new CostCalculator();

/**
 * POST /api/forecasting/budget-forecast
 * Create a new budget forecast
 */
router.post('/budget-forecast', [
  authenticateToken,
  body('department_id').optional().isInt(),
  body('scenario_name').notEmpty().isString(),
  body('forecast_period_months').isInt({ min: 1, max: 60 }),
  body('parameters').isObject(),
  body('academic_year').isInt(),
  body('semester').optional().trim(),
  body('projected_revenue').optional().isFloat({ min: 0 }),
  body('projected_expenses').optional().isFloat({ min: 0 }),
  body('projected_enrollment').optional().isInt({ min: 0 }),
  body('assumptions').optional().trim()
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
      department_id,
      scenario_name,
      forecast_period_months,
      parameters,
      academic_year,
      semester,
      projected_revenue = 0,
      projected_expenses = 0,
      projected_enrollment = 0,
      assumptions,
      confidence_level = 75
    } = req.body;

    // Get historical data for baseline calculations
    const historicalQuery = `
      SELECT 
        AVG(c.total_cost) as avg_course_cost,
        AVG(c.expected_students) as avg_enrollment,
        COUNT(c.id) as course_count
      FROM courses c
      WHERE c.department_id = $1
    `;
    const historicalResult = await pool.query(historicalQuery, [department_id]);
    const historical = historicalResult.rows[0];

    // Calculate projections based on forecast type
    let calculatedExpenses = projected_expenses;
    let calculatedRevenue = projected_revenue;
    let calculatedEnrollment = projected_enrollment;

    if (calculatedExpenses === 0) {
      const baseCost = parseFloat(historical.avg_course_cost) || 8000;
      const courseCount = parseInt(historical.course_count) || 10;
      
      switch (forecast_type) {
        case 'OPTIMISTIC':
          calculatedExpenses = baseCost * courseCount * 0.9; // 10% cost reduction
          break;
        case 'PESSIMISTIC':
          calculatedExpenses = baseCost * courseCount * 1.2; // 20% cost increase
          break;
        case 'REALISTIC':
        default:
          calculatedExpenses = baseCost * courseCount * 1.05; // 5% inflation
          break;
      }
    }

    if (calculatedEnrollment === 0) {
      const baseEnrollment = parseFloat(historical.avg_enrollment) || 25;
      const courseCount = parseInt(historical.course_count) || 10;
      
      switch (forecast_type) {
        case 'OPTIMISTIC':
          calculatedEnrollment = Math.round(baseEnrollment * courseCount * 1.1); // 10% growth
          break;
        case 'PESSIMISTIC':
          calculatedEnrollment = Math.round(baseEnrollment * courseCount * 0.9); // 10% decline
          break;
        case 'REALISTIC':
        default:
          calculatedEnrollment = Math.round(baseEnrollment * courseCount * 1.02); // 2% growth
          break;
      }
    }

    if (calculatedRevenue === 0) {
      const tuitionPerStudent = 5000; // Example tuition rate
      calculatedRevenue = calculatedEnrollment * tuitionPerStudent;
    }

    const query = `
      INSERT INTO budget_forecasts (department_id, scenario_name, forecast_type, academic_year,
                                   semester, projected_revenue, projected_expenses, projected_enrollment,
                                   assumptions, confidence_level, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;

    const result = await pool.query(query, [
      department_id, scenario_name, forecast_type, academic_year, semester,
      calculatedRevenue, calculatedExpenses, calculatedEnrollment,
      assumptions, confidence_level, req.user.userId
    ]);

    res.status(201).json({
      success: true,
      message: 'Budget forecast created successfully',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Budget forecast creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create budget forecast'
    });
  }
});

/**
 * GET /api/forecasting/budget-forecasts
 * Get budget forecasts with filtering
 */
router.get('/budget-forecasts', authenticateToken, async (req, res) => {
  try {
    const { department_id, academic_year, forecast_type } = req.query;

    let query = `
      SELECT bf.*, d.name as department_name, u.first_name || ' ' || u.last_name as created_by_name
      FROM budget_forecasts bf
      JOIN departments d ON bf.department_id = d.id
      JOIN users u ON bf.created_by = u.id
      WHERE 1=1
    `;
    const queryParams = [];
    let paramCount = 0;

    if (department_id) {
      paramCount++;
      query += ` AND bf.department_id = $${paramCount}`;
      queryParams.push(department_id);
    }

    if (academic_year) {
      paramCount++;
      query += ` AND bf.academic_year = $${paramCount}`;
      queryParams.push(academic_year);
    }

    if (forecast_type) {
      paramCount++;
      query += ` AND bf.forecast_type = $${paramCount}`;
      queryParams.push(forecast_type);
    }

    query += ' ORDER BY bf.department_id, bf.academic_year DESC, bf.created_at DESC';

    const result = await pool.query(query, queryParams);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Budget forecasts fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch budget forecasts'
    });
  }
});

/**
 * POST /api/forecasting/scenario-comparison
 * Compare multiple forecast scenarios
 */
router.post('/scenario-comparison', [
  authenticateToken,
  body('scenario_ids').isArray({ min: 2 }),
  body('comparison_metrics').optional().isArray()
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

    const { forecast_ids, comparison_metrics = ['revenue', 'expenses', 'enrollment', 'net_result'] } = req.body;

    // Fetch forecasts
    const query = `
      SELECT bf.*, d.name as department_name
      FROM budget_forecasts bf
      JOIN departments d ON bf.department_id = d.id
      WHERE bf.id = ANY($1)
      ORDER BY bf.forecast_type, bf.scenario_name
    `;

    const result = await pool.query(query, [forecast_ids]);
    const forecasts = result.rows;

    if (forecasts.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'At least 2 forecasts required for comparison'
      });
    }

    // Calculate comparison metrics
    const comparison = {
      forecasts: forecasts.map(forecast => ({
        ...forecast,
        net_result: forecast.projected_revenue - forecast.projected_expenses,
        roi_percentage: forecast.projected_revenue > 0 ? 
          ((forecast.projected_revenue - forecast.projected_expenses) / forecast.projected_revenue) * 100 : 0
      })),
      analysis: {
        revenue_range: {
          min: Math.min(...forecasts.map(f => f.projected_revenue)),
          max: Math.max(...forecasts.map(f => f.projected_revenue)),
          avg: forecasts.reduce((sum, f) => sum + f.projected_revenue, 0) / forecasts.length
        },
        expense_range: {
          min: Math.min(...forecasts.map(f => f.projected_expenses)),
          max: Math.max(...forecasts.map(f => f.projected_expenses)),
          avg: forecasts.reduce((sum, f) => sum + f.projected_expenses, 0) / forecasts.length
        },
        enrollment_range: {
          min: Math.min(...forecasts.map(f => f.projected_enrollment)),
          max: Math.max(...forecasts.map(f => f.projected_enrollment)),
          avg: forecasts.reduce((sum, f) => sum + f.projected_enrollment, 0) / forecasts.length
        }
      },
      recommendations: []
    };

    // Generate recommendations
    const bestCase = comparison.forecasts.reduce((best, current) => 
      (current.projected_revenue - current.projected_expenses) > (best.projected_revenue - best.projected_expenses) ? current : best
    );

    const worstCase = comparison.forecasts.reduce((worst, current) => 
      (current.projected_revenue - current.projected_expenses) < (worst.projected_revenue - worst.projected_expenses) ? current : worst
    );

    comparison.recommendations.push(`Best case scenario: ${bestCase.scenario_name} with net result of $${(bestCase.projected_revenue - bestCase.projected_expenses).toLocaleString()}`);
    comparison.recommendations.push(`Worst case scenario: ${worstCase.scenario_name} with net result of $${(worstCase.projected_revenue - worstCase.projected_expenses).toLocaleString()}`);

    const revenueVariance = (comparison.analysis.revenue_range.max - comparison.analysis.revenue_range.min) / comparison.analysis.revenue_range.avg;
    if (revenueVariance > 0.2) {
      comparison.recommendations.push('High revenue variance detected - consider risk mitigation strategies');
    }

    res.json({
      success: true,
      data: comparison
    });

  } catch (error) {
    console.error('Scenario comparison error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to compare scenarios'
    });
  }
});

/**
 * GET /api/forecasting/trend-analysis
 * Analyze historical trends for forecasting
 */
router.get('/trend-analysis', authenticateToken, async (req, res) => {
  try {
    const { department_id, years_back = 3 } = req.query;

    const currentYear = new Date().getFullYear();
    const startYear = currentYear - parseInt(years_back);

    // Historical budget data
    let budgetQuery = `
      SELECT 
        bf.academic_year,
        bf.forecast_type,
        AVG(bf.projected_revenue) as avg_revenue,
        AVG(bf.projected_expenses) as avg_expenses,
        AVG(bf.projected_enrollment) as avg_enrollment
      FROM budget_forecasts bf
      WHERE bf.academic_year >= $1 AND bf.academic_year <= $2
    `;
    const queryParams = [startYear, currentYear];
    let paramCount = 2;

    if (department_id) {
      paramCount++;
      budgetQuery += ` AND bf.department_id = $${paramCount}`;
      queryParams.push(department_id);
    }

    budgetQuery += ' GROUP BY bf.academic_year, bf.forecast_type ORDER BY bf.academic_year';

    const budgetResult = await pool.query(budgetQuery, queryParams);

    // Historical course data
    let courseQuery = `
      SELECT 
        EXTRACT(YEAR FROM c.created_at) as year,
        COUNT(c.id) as course_count,
        AVG(c.total_cost) as avg_cost,
        AVG(c.expected_students) as avg_students
      FROM courses c
      WHERE EXTRACT(YEAR FROM c.created_at) >= $1
    `;
    const courseParams = [startYear];

    if (department_id) {
      courseQuery += ' AND c.department_id = $2';
      courseParams.push(department_id);
    }

    courseQuery += ' GROUP BY EXTRACT(YEAR FROM c.created_at) ORDER BY year';

    const courseResult = await pool.query(courseQuery, courseParams);

    // Calculate trends
    const trends = {
      budget_trends: calculateTrend(budgetResult.rows, 'avg_expenses'),
      revenue_trends: calculateTrend(budgetResult.rows, 'avg_revenue'),
      enrollment_trends: calculateTrend(budgetResult.rows, 'avg_enrollment'),
      course_cost_trends: calculateTrend(courseResult.rows, 'avg_cost'),
      course_count_trends: calculateTrend(courseResult.rows, 'course_count')
    };

    // Generate projections for next year
    const nextYearProjections = {
      academic_year: currentYear + 1,
      projected_expenses: projectNextValue(courseResult.rows, 'avg_cost') * 
                         projectNextValue(courseResult.rows, 'course_count'),
      projected_enrollment: projectNextValue(budgetResult.rows, 'avg_enrollment'),
      confidence_intervals: calculateConfidenceIntervals(budgetResult.rows, courseResult.rows)
    };

    res.json({
      success: true,
      data: {
        historical_data: {
          budget_forecasts: budgetResult.rows,
          course_data: courseResult.rows
        },
        trends: trends,
        projections: nextYearProjections,
        analysis_period: {
          start_year: startYear,
          end_year: currentYear,
          years_analyzed: parseInt(years_back)
        }
      }
    });

  } catch (error) {
    console.error('Trend analysis error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to perform trend analysis'
    });
  }
});

/**
 * POST /api/forecasting/variance-analysis
 * Analyze variance between forecasts and actuals
 */
router.post('/variance-analysis', [
  authenticateToken,
  body('forecast_id').isInt(),
  body('actual_data').isObject()
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

    const { forecast_id, actual_data } = req.body;

    // Get forecast data
    const forecastQuery = 'SELECT * FROM budget_forecasts WHERE id = $1';
    const forecastResult = await pool.query(forecastQuery, [forecast_id]);

    if (forecastResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Forecast not found'
      });
    }

    const forecast = forecastResult.rows[0];

    // Calculate variances
    const variance = costCalculator.generateVarianceAnalysis(
      {
        revenue: forecast.projected_revenue,
        expenses: forecast.projected_expenses,
        enrollment: forecast.projected_enrollment,
        total: forecast.projected_revenue
      },
      {
        revenue: actual_data.actual_revenue || 0,
        expenses: actual_data.actual_expenses || 0,
        enrollment: actual_data.actual_enrollment || 0,
        total: actual_data.actual_revenue || 0
      },
      {
        start: forecast.created_at,
        end: new Date()
      }
    );

    // Save variance analysis
    const varianceQuery = `
      INSERT INTO budget_variances (department_id, budget_category, budgeted_amount, 
                                   actual_amount, period_start, period_end, explanation)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const varianceRecords = [];
    
    // Save revenue variance
    if (actual_data.actual_revenue !== undefined) {
      const revenueVariance = await pool.query(varianceQuery, [
        forecast.department_id, 'REVENUE', forecast.projected_revenue,
        actual_data.actual_revenue, forecast.created_at, new Date(),
        `Variance analysis for forecast: ${forecast.scenario_name}`
      ]);
      varianceRecords.push(revenueVariance.rows[0]);
    }

    // Save expense variance
    if (actual_data.actual_expenses !== undefined) {
      const expenseVariance = await pool.query(varianceQuery, [
        forecast.department_id, 'EXPENSES', forecast.projected_expenses,
        actual_data.actual_expenses, forecast.created_at, new Date(),
        `Variance analysis for forecast: ${forecast.scenario_name}`
      ]);
      varianceRecords.push(expenseVariance.rows[0]);
    }

    res.json({
      success: true,
      message: 'Variance analysis completed',
      data: {
        forecast: forecast,
        actual_data: actual_data,
        variance_analysis: variance,
        variance_records: varianceRecords
      }
    });

  } catch (error) {
    console.error('Variance analysis error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to perform variance analysis'
    });
  }
});

// Helper functions

function calculateTrend(data, field) {
  if (data.length < 2) return { direction: 'insufficient_data', slope: 0 };

  const values = data.map(d => parseFloat(d[field]) || 0);
  const n = values.length;
  
  // Simple linear regression
  const xSum = data.reduce((sum, _, i) => sum + i, 0);
  const ySum = values.reduce((sum, val) => sum + val, 0);
  const xySum = values.reduce((sum, val, i) => sum + (i * val), 0);
  const x2Sum = data.reduce((sum, _, i) => sum + (i * i), 0);
  
  const slope = (n * xySum - xSum * ySum) / (n * x2Sum - xSum * xSum);
  
  return {
    direction: slope > 0.01 ? 'increasing' : slope < -0.01 ? 'decreasing' : 'stable',
    slope: slope,
    correlation: calculateCorrelation(data.map((_, i) => i), values)
  };
}

function calculateCorrelation(x, y) {
  const n = x.length;
  const xMean = x.reduce((sum, val) => sum + val, 0) / n;
  const yMean = y.reduce((sum, val) => sum + val, 0) / n;
  
  const numerator = x.reduce((sum, val, i) => sum + ((val - xMean) * (y[i] - yMean)), 0);
  const xVariance = x.reduce((sum, val) => sum + Math.pow(val - xMean, 2), 0);
  const yVariance = y.reduce((sum, val) => sum + Math.pow(val - yMean, 2), 0);
  
  return numerator / Math.sqrt(xVariance * yVariance);
}

function projectNextValue(data, field) {
  if (data.length === 0) return 0;
  
  const trend = calculateTrend(data, field);
  const lastValue = parseFloat(data[data.length - 1][field]) || 0;
  
  return lastValue + trend.slope;
}

function calculateConfidenceIntervals(budgetData, courseData) {
  // Simplified confidence interval calculation
  const revenueValues = budgetData.map(d => parseFloat(d.avg_revenue) || 0);
  const expenseValues = budgetData.map(d => parseFloat(d.avg_expenses) || 0);
  
  return {
    revenue: {
      lower_bound: Math.min(...revenueValues) * 0.9,
      upper_bound: Math.max(...revenueValues) * 1.1
    },
    expenses: {
      lower_bound: Math.min(...expenseValues) * 0.9,
      upper_bound: Math.max(...expenseValues) * 1.1
    }
  };
}

module.exports = router;
