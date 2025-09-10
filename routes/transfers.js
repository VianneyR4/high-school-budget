const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken, requireRole } = require('../middleware/auth');
const pool = require('../config/database');

const router = express.Router();

// Get transfers (role-based access)
router.get('/', authenticateToken, async (req, res) => {
  try {
    let query;
    let params = [];

    if (req.user.role === 'ADMIN') {
      // Admin sees all transfers
      query = `
        SELECT t.*, 
               df.name as from_department_name,
               dt.name as to_department_name,
               u.email as created_by_email
        FROM transfers t
        JOIN departments df ON t.from_department_id = df.id
        JOIN departments dt ON t.to_department_id = dt.id
        JOIN users u ON t.created_by = u.id
        ORDER BY t.created_at DESC
      `;
    } else {
      // Department heads see only transfers involving their department
      query = `
        SELECT t.*, 
               df.name as from_department_name,
               dt.name as to_department_name,
               u.email as created_by_email
        FROM transfers t
        JOIN departments df ON t.from_department_id = df.id
        JOIN departments dt ON t.to_department_id = dt.id
        JOIN users u ON t.created_by = u.id
        WHERE t.from_department_id = $1 OR t.to_department_id = $1
        ORDER BY t.created_at DESC
      `;
      params = [req.user.department_id];
    }

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Get transfers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transfers'
    });
  }
});

// Create budget transfer
router.post('/', [
  authenticateToken,
  requireRole(['DEPARTMENT_HEAD', 'ADMIN']),
  body('from_department_id').isInt({ min: 1 }).withMessage('Valid from department ID is required'),
  body('to_department_id').isInt({ min: 1 }).withMessage('Valid to department ID is required'),
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
  body('reason').optional().trim().isLength({ max: 500 }).withMessage('Reason must not exceed 500 characters')
], async (req, res) => {
  const client = await pool.connect();
  
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { from_department_id, to_department_id, amount, reason } = req.body;

    // Department heads can only transfer from their own department
    if (req.user.role === 'DEPARTMENT_HEAD' && req.user.department_id !== parseInt(from_department_id)) {
      return res.status(403).json({
        success: false,
        message: 'You can only transfer from your own department'
      });
    }

    // Cannot transfer to the same department
    if (from_department_id === to_department_id) {
      return res.status(400).json({
        success: false,
        message: 'Cannot transfer to the same department'
      });
    }

    await client.query('BEGIN');

    // Check if both departments exist and get current budgets
    const deptResult = await client.query(
      'SELECT id, name, budget FROM departments WHERE id IN ($1, $2)',
      [from_department_id, to_department_id]
    );

    if (deptResult.rows.length !== 2) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'One or both departments not found'
      });
    }

    const fromDept = deptResult.rows.find(d => d.id === parseInt(from_department_id));
    const toDept = deptResult.rows.find(d => d.id === parseInt(to_department_id));

    // Check if from department has sufficient budget
    if (fromDept.budget < amount) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: `Insufficient budget in ${fromDept.name}. Available: $${fromDept.budget}`
      });
    }

    // Update department budgets
    await client.query(
      'UPDATE departments SET budget = budget - $1 WHERE id = $2',
      [amount, from_department_id]
    );

    await client.query(
      'UPDATE departments SET budget = budget + $1 WHERE id = $2',
      [amount, to_department_id]
    );

    // Record the transfer
    const transferResult = await client.query(
      `INSERT INTO transfers (from_department_id, to_department_id, amount, reason, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [from_department_id, to_department_id, amount, reason, req.user.id]
    );

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: `Successfully transferred $${amount} from ${fromDept.name} to ${toDept.name}`,
      data: transferResult.rows[0]
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Transfer error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process transfer'
    });
  } finally {
    client.release();
  }
});

module.exports = router;
