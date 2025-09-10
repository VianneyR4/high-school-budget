const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken, requireRole, requireDepartmentAccess } = require('../middleware/auth');
const pool = require('../config/database');

const router = express.Router();

// Get courses (role-based access)
router.get('/', authenticateToken, async (req, res) => {
  try {
    let query;
    let params = [];

    if (req.user.role === 'ADMIN') {
      // Admin sees all courses
      query = `
        SELECT c.*, d.name as department_name
        FROM courses c
        JOIN departments d ON c.department_id = d.id
        ORDER BY d.name, c.name
      `;
    } else {
      // Department heads see only their department's courses
      query = `
        SELECT c.*, d.name as department_name
        FROM courses c
        JOIN departments d ON c.department_id = d.id
        WHERE c.department_id = $1
        ORDER BY c.name
      `;
      params = [req.user.department_id];
    }

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Get courses error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch courses'
    });
  }
});

// Create new course
router.post('/', [
  authenticateToken,
  body('name').trim().isLength({ min: 1 }).withMessage('Course name is required'),
  body('department_id').isInt({ min: 1 }).withMessage('Valid department ID is required'),
  body('expected_students').isInt({ min: 0 }).withMessage('Expected students must be a non-negative number'),
  body('instructor_cost').isFloat({ min: 0 }).withMessage('Instructor cost must be a non-negative number'),
  body('classroom_cost').isFloat({ min: 0 }).withMessage('Classroom cost must be a non-negative number')
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

    const { name, department_id, expected_students, instructor_cost, classroom_cost } = req.body;

    // Check if user has access to this department
    if (req.user.role === 'DEPARTMENT_HEAD' && req.user.department_id !== parseInt(department_id)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this department'
      });
    }

    // Check if department exists
    const deptCheck = await pool.query('SELECT id, budget FROM departments WHERE id = $1', [department_id]);
    if (deptCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Department not found'
      });
    }

    const totalCost = parseFloat(instructor_cost) + parseFloat(classroom_cost);
    
    // Check if department has enough budget
    const currentAllocated = await pool.query(
      'SELECT COALESCE(SUM(total_cost), 0) as allocated FROM courses WHERE department_id = $1',
      [department_id]
    );
    
    const availableBudget = deptCheck.rows[0].budget - currentAllocated.rows[0].allocated;
    
    if (totalCost > availableBudget) {
      return res.status(400).json({
        success: false,
        message: `Insufficient budget. Available: $${availableBudget.toFixed(2)}, Required: $${totalCost.toFixed(2)}`
      });
    }

    // Create course
    const result = await pool.query(
      `INSERT INTO courses (name, department_id, expected_students, instructor_cost, classroom_cost)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name, department_id, expected_students, instructor_cost, classroom_cost]
    );

    res.status(201).json({
      success: true,
      message: 'Course created successfully',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Create course error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create course'
    });
  }
});

// Get single course
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    let query = `
      SELECT c.*, d.name as department_name
      FROM courses c
      JOIN departments d ON c.department_id = d.id
      WHERE c.id = $1
    `;
    let params = [id];

    // Add department filter for department heads
    if (req.user.role === 'DEPARTMENT_HEAD') {
      query += ' AND c.department_id = $2';
      params.push(req.user.department_id);
    }

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Course not found or access denied'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Get course error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch course'
    });
  }
});

module.exports = router;
