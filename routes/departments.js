const express = require('express');
const { authenticateToken, requireRole, requireDepartmentAccess } = require('../middleware/auth');
const pool = require('../config/database');

const router = express.Router();

// Get departments (role-based access)
router.get('/', authenticateToken, async (req, res) => {
  try {
    let query;
    let params = [];

    if (req.user.role === 'ADMIN') {
      // Admin sees all departments
      query = `
        SELECT d.*, 
               COUNT(c.id) as course_count,
               COALESCE(SUM(c.total_cost), 0) as total_allocated
        FROM departments d
        LEFT JOIN courses c ON d.id = c.department_id
        GROUP BY d.id
        ORDER BY d.name
      `;
    } else {
      // Department heads see only their department
      query = `
        SELECT d.*, 
               COUNT(c.id) as course_count,
               COALESCE(SUM(c.total_cost), 0) as total_allocated
        FROM departments d
        LEFT JOIN courses c ON d.id = c.department_id
        WHERE d.id = $1
        GROUP BY d.id
      `;
      params = [req.user.department_id];
    }

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Get departments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch departments'
    });
  }
});

// Get single department
router.get('/:id', authenticateToken, requireDepartmentAccess, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT d.*, 
              COUNT(c.id) as course_count,
              COALESCE(SUM(c.total_cost), 0) as total_allocated,
              (d.budget - COALESCE(SUM(c.total_cost), 0)) as remaining_budget
       FROM departments d
       LEFT JOIN courses c ON d.id = c.department_id
       WHERE d.id = $1
       GROUP BY d.id`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Department not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Get department error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch department'
    });
  }
});

module.exports = router;
