const jwt = require('jsonwebtoken');
const pool = require('../config/database');

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ 
      success: false, 
      message: 'Access token required' 
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get fresh user data from database
    const result = await pool.query(
      'SELECT id, email, role, department_id FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    req.user = result.rows[0];
    next();
  } catch (error) {
    return res.status(403).json({ 
      success: false, 
      message: 'Invalid or expired token' 
    });
  }
};

const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Insufficient permissions' 
      });
    }

    next();
  };
};

const requireDepartmentAccess = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      success: false, 
      message: 'Authentication required' 
    });
  }

  // Admin can access everything
  if (req.user.role === 'ADMIN') {
    return next();
  }

  // Department heads can only access their own department
  if (req.user.role === 'DEPARTMENT_HEAD') {
    const departmentId = req.params.departmentId || req.body.department_id;
    
    if (departmentId && parseInt(departmentId) !== req.user.department_id) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied to this department' 
      });
    }
  }

  next();
};

module.exports = {
  authenticateToken,
  requireRole,
  requireDepartmentAccess
};
