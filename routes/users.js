const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/users
 * Get all users with filtering
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { role, department_id } = req.query;

    let query = `
      SELECT 
        u.*,
        d.name as department_name
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      WHERE 1=1
    `;
    const queryParams = [];
    let paramCount = 0;

    if (role) {
      paramCount++;
      query += ` AND u.role = $${paramCount}`;
      queryParams.push(role);
    }

    if (department_id) {
      paramCount++;
      query += ` AND u.department_id = $${paramCount}`;
      queryParams.push(department_id);
    }

    query += ' ORDER BY u.last_name, u.first_name';

    const result = await pool.query(query, queryParams);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Users fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users'
    });
  }
});

/**
 * PUT /api/users/:id/role
 * Update user role (Admin only)
 */
router.put('/:id/role', [
  authenticateToken,
  body('role').isIn(['ADMIN', 'DEPARTMENT_HEAD', 'TEACHER', 'USER']),
  body('department_id').optional().isInt()
], async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Only administrators can change user roles'
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const { role, department_id } = req.body;

    // Check if user exists
    const userCheck = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update user role and department
    const query = `
      UPDATE users 
      SET role = $1, department_id = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING id, email, first_name, last_name, role, department_id
    `;

    const result = await pool.query(query, [role, department_id, id]);

    res.json({
      success: true,
      message: 'User role updated successfully',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Role update error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user role'
    });
  }
});

/**
 * GET /api/users/:id
 * Get user details
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
        u.*,
        d.name as department_name
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      WHERE u.id = $1
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('User fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user'
    });
  }
});

/**
 * PUT /api/users/:id
 * Update user profile
 */
router.put('/:id', [
  authenticateToken,
  body('first_name').optional().isString().trim(),
  body('last_name').optional().isString().trim(),
  body('email').optional().isEmail(),
  body('employment_type').optional().isString(),
  body('hire_date').optional().isISO8601()
], async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Check if user can update this profile
    if (req.user.id !== parseInt(id) && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own profile'
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    // Build dynamic update query
    const setClause = [];
    const queryParams = [];
    let paramCount = 0;

    Object.keys(updates).forEach(key => {
      if (updates[key] !== undefined && key !== 'role' && key !== 'department_id') {
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
      UPDATE users 
      SET ${setClause.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount}
      RETURNING id, email, first_name, last_name, role, department_id, employment_type, hire_date
    `;

    const result = await pool.query(query, queryParams);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  }
});

module.exports = router;
