const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const pool = require('../config/database');

const router = express.Router();

// Get cost per student metrics
router.get('/cost-per-student', authenticateToken, async (req, res) => {
  try {
    let query;
    let params = [];

    if (req.user.role === 'ADMIN') {
      // Admin sees all departments
      query = `
        SELECT 
          d.id,
          d.name as department_name,
          d.budget,
          COUNT(c.id) as course_count,
          COALESCE(SUM(c.expected_students), 0) as total_students,
          COALESCE(SUM(c.total_cost), 0) as total_allocated,
          CASE 
            WHEN SUM(c.expected_students) > 0 
            THEN ROUND(SUM(c.total_cost) / SUM(c.expected_students), 2)
            ELSE 0 
          END as cost_per_student
        FROM departments d
        LEFT JOIN courses c ON d.id = c.department_id
        GROUP BY d.id, d.name, d.budget
        ORDER BY d.name
      `;
    } else {
      // Department heads see only their department
      query = `
        SELECT 
          d.id,
          d.name as department_name,
          d.budget,
          COUNT(c.id) as course_count,
          COALESCE(SUM(c.expected_students), 0) as total_students,
          COALESCE(SUM(c.total_cost), 0) as total_allocated,
          CASE 
            WHEN SUM(c.expected_students) > 0 
            THEN ROUND(SUM(c.total_cost) / SUM(c.expected_students), 2)
            ELSE 0 
          END as cost_per_student
        FROM departments d
        LEFT JOIN courses c ON d.id = c.department_id
        WHERE d.id = $1
        GROUP BY d.id, d.name, d.budget
      `;
      params = [req.user.department_id];
    }

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Cost per student metrics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch cost per student metrics'
    });
  }
});

// Get budget utilization metrics
router.get('/utilization', authenticateToken, async (req, res) => {
  try {
    let query;
    let params = [];

    if (req.user.role === 'ADMIN') {
      // Admin sees all departments
      query = `
        SELECT 
          d.id,
          d.name as department_name,
          d.budget,
          COALESCE(SUM(c.total_cost), 0) as allocated,
          d.budget - COALESCE(SUM(c.total_cost), 0) as remaining,
          CASE 
            WHEN d.budget > 0 
            THEN ROUND((COALESCE(SUM(c.total_cost), 0) / d.budget) * 100, 2)
            ELSE 0 
          END as utilization_percentage
        FROM departments d
        LEFT JOIN courses c ON d.id = c.department_id
        GROUP BY d.id, d.name, d.budget
        ORDER BY utilization_percentage DESC
      `;
    } else {
      // Department heads see only their department
      query = `
        SELECT 
          d.id,
          d.name as department_name,
          d.budget,
          COALESCE(SUM(c.total_cost), 0) as allocated,
          d.budget - COALESCE(SUM(c.total_cost), 0) as remaining,
          CASE 
            WHEN d.budget > 0 
            THEN ROUND((COALESCE(SUM(c.total_cost), 0) / d.budget) * 100, 2)
            ELSE 0 
          END as utilization_percentage
        FROM departments d
        LEFT JOIN courses c ON d.id = c.department_id
        WHERE d.id = $1
        GROUP BY d.id, d.name, d.budget
      `;
      params = [req.user.department_id];
    }

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Utilization metrics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch utilization metrics'
    });
  }
});

// Get overall summary metrics (admin only)
router.get('/summary', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const summaryQuery = `
      SELECT 
        COUNT(DISTINCT d.id) as total_departments,
        COUNT(DISTINCT c.id) as total_courses,
        SUM(d.budget) as total_budget,
        COALESCE(SUM(c.total_cost), 0) as total_allocated,
        SUM(d.budget) - COALESCE(SUM(c.total_cost), 0) as total_remaining,
        COALESCE(SUM(c.expected_students), 0) as total_students,
        CASE 
          WHEN SUM(c.expected_students) > 0 
          THEN ROUND(SUM(c.total_cost) / SUM(c.expected_students), 2)
          ELSE 0 
        END as avg_cost_per_student
      FROM departments d
      LEFT JOIN courses c ON d.id = c.department_id
    `;

    const transferQuery = `
      SELECT COUNT(*) as total_transfers, COALESCE(SUM(amount), 0) as total_transferred
      FROM transfers
    `;

    const [summaryResult, transferResult] = await Promise.all([
      pool.query(summaryQuery),
      pool.query(transferQuery)
    ]);

    const summary = summaryResult.rows[0];
    const transfers = transferResult.rows[0];

    res.json({
      success: true,
      data: {
        ...summary,
        ...transfers,
        utilization_percentage: summary.total_budget > 0 
          ? Math.round((summary.total_allocated / summary.total_budget) * 100 * 100) / 100
          : 0
      }
    });

  } catch (error) {
    console.error('Summary metrics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch summary metrics'
    });
  }
});

module.exports = router;
