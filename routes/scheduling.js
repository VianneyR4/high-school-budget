const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/schedules
 * Get course schedules with filtering
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { semester, academic_year, department_id, instructor_id, facility_id, status } = req.query;

    let query = `
      SELECT 
        cs.*,
        c.name as course_name,
        u.first_name || ' ' || u.last_name as instructor_name,
        f.name as facility_name,
        f.type as facility_type,
        d.name as department_name,
        COUNT(ce.user_id) as assigned_count
      FROM course_schedules cs
      JOIN courses c ON cs.course_id = c.id
      JOIN departments d ON c.department_id = d.id
      LEFT JOIN users u ON cs.instructor_id = u.id
      LEFT JOIN facilities f ON cs.facility_id = f.id
      LEFT JOIN course_enrollments ce ON cs.id = ce.schedule_id AND ce.status = 'ENROLLED'
      WHERE 1=1
    `;
    const queryParams = [];
    let paramCount = 0;

    if (semester) {
      paramCount++;
      query += ` AND cs.semester = $${paramCount}`;
      queryParams.push(semester);
    }

    if (academic_year) {
      paramCount++;
      query += ` AND cs.academic_year = $${paramCount}`;
      queryParams.push(academic_year);
    }

    if (department_id) {
      paramCount++;
      query += ` AND c.department_id = $${paramCount}`;
      queryParams.push(department_id);
    }

    if (instructor_id) {
      paramCount++;
      query += ` AND cs.instructor_id = $${paramCount}`;
      queryParams.push(instructor_id);
    }

    if (facility_id) {
      paramCount++;
      query += ` AND cs.facility_id = $${paramCount}`;
      queryParams.push(facility_id);
    }

    if (status) {
      paramCount++;
      query += ` AND cs.status = $${paramCount}`;
      queryParams.push(status);
    }

    query += ' GROUP BY cs.id, c.name, u.first_name, u.last_name, f.name, f.type, d.name ORDER BY cs.day_of_week, cs.start_time, c.name';

    const result = await pool.query(query, queryParams);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Schedules fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch schedules'
    });
  }
});

/**
 * POST /api/schedules
 * Create a new course schedule
 */
router.post('/', [
  authenticateToken,
  body('course_id').isInt(),
  body('instructor_id').isInt(),
  body('facility_id').isInt(),
  body('day_of_week').isInt({ min: 0, max: 6 }),
  body('start_time').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  body('end_time').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  body('semester').notEmpty().isString(),
  body('academic_year').isInt()
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
      course_id,
      instructor_id,
      facility_id,
      semester,
      academic_year,
      day_of_week,
      start_time,
      end_time,
      enrollment_actual = 0,
      status = 'SCHEDULED'
    } = req.body;

    // Check for conflicts
    const conflicts = await checkScheduleConflicts(instructor_id, facility_id, day_of_week, start_time, end_time, semester, academic_year);
    
    if (conflicts.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Schedule conflicts detected',
        conflicts: conflicts
      });
    }

    const query = `
      INSERT INTO course_schedules (course_id, instructor_id, facility_id, semester, academic_year,
                                   day_of_week, start_time, end_time, enrollment_actual, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const result = await pool.query(query, [
      course_id, instructor_id, facility_id, semester, academic_year,
      day_of_week, start_time, end_time, enrollment_actual, status
    ]);

    res.status(201).json({
      success: true,
      message: 'Schedule created successfully',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Schedule creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create schedule'
    });
  }
});

/**
 * GET /api/schedules/calendar
 * Get calendar view of schedules
 */
router.get('/calendar', authenticateToken, async (req, res) => {
  try {
    const { semester, academic_year, department_id } = req.query;

    if (!semester || !academic_year) {
      return res.status(400).json({
        success: false,
        message: 'Semester and academic year are required'
      });
    }

    let query = `
      SELECT 
        cs.*,
        c.name as course_name,
        c.expected_students,
        u.first_name || ' ' || u.last_name as instructor_name,
        f.name as facility_name,
        f.capacity as facility_capacity,
        d.name as department_name
      FROM course_schedules cs
      JOIN courses c ON cs.course_id = c.id
      JOIN departments d ON c.department_id = d.id
      LEFT JOIN users u ON cs.instructor_id = u.id
      LEFT JOIN facilities f ON cs.facility_id = f.id
      WHERE cs.semester = $1 AND cs.academic_year = $2 AND cs.status != 'CANCELLED'
    `;
    const queryParams = [semester, academic_year];

    if (department_id) {
      query += ' AND c.department_id = $3';
      queryParams.push(department_id);
    }

    query += ' ORDER BY cs.day_of_week, cs.start_time';

    const result = await pool.query(query, queryParams);

    // Organize by day of week
    const calendar = {
      Monday: [],
      Tuesday: [],
      Wednesday: [],
      Thursday: [],
      Friday: [],
      Saturday: [],
      Sunday: []
    };

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    result.rows.forEach(schedule => {
      const dayName = dayNames[schedule.day_of_week];
      calendar[dayName].push(schedule);
    });

    res.json({
      success: true,
      data: {
        calendar,
        summary: {
          total_schedules: result.rows.length,
          by_day: Object.keys(calendar).map(day => ({
            day,
            count: calendar[day].length
          }))
        }
      }
    });

  } catch (error) {
    console.error('Calendar fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch calendar'
    });
  }
});

/**
 * GET /api/schedules/conflicts
 * Check for scheduling conflicts
 */
router.get('/conflicts', authenticateToken, async (req, res) => {
  try {
    const { semester, academic_year, department_id } = req.query;

    // Find instructor conflicts
    const instructorConflictsQuery = `
      SELECT 
        u.first_name || ' ' || u.last_name as instructor_name,
        cs1.day_of_week,
        cs1.start_time,
        cs1.end_time,
        array_agg(c.name) as conflicting_courses
      FROM course_schedules cs1
      JOIN course_schedules cs2 ON cs1.instructor_id = cs2.instructor_id 
        AND cs1.id != cs2.id
        AND cs1.day_of_week = cs2.day_of_week
        AND cs1.semester = cs2.semester
        AND cs1.academic_year = cs2.academic_year
        AND (
          (cs1.start_time <= cs2.start_time AND cs1.end_time > cs2.start_time) OR
          (cs1.start_time < cs2.end_time AND cs1.end_time >= cs2.end_time) OR
          (cs1.start_time >= cs2.start_time AND cs1.end_time <= cs2.end_time)
        )
      JOIN courses c ON cs1.course_id = c.id
      JOIN users u ON cs1.instructor_id = u.id
      WHERE cs1.semester = $1 AND cs1.academic_year = $2
        AND cs1.status != 'CANCELLED' AND cs2.status != 'CANCELLED'
      ${department_id ? 'AND c.department_id = $3' : ''}
      GROUP BY u.first_name, u.last_name, cs1.day_of_week, cs1.start_time, cs1.end_time
    `;

    // Find facility conflicts
    const facilityConflictsQuery = `
      SELECT 
        f.name as facility_name,
        cs1.day_of_week,
        cs1.start_time,
        cs1.end_time,
        array_agg(c.name) as conflicting_courses
      FROM course_schedules cs1
      JOIN course_schedules cs2 ON cs1.facility_id = cs2.facility_id 
        AND cs1.id != cs2.id
        AND cs1.day_of_week = cs2.day_of_week
        AND cs1.semester = cs2.semester
        AND cs1.academic_year = cs2.academic_year
        AND (
          (cs1.start_time <= cs2.start_time AND cs1.end_time > cs2.start_time) OR
          (cs1.start_time < cs2.end_time AND cs1.end_time >= cs2.end_time) OR
          (cs1.start_time >= cs2.start_time AND cs1.end_time <= cs2.end_time)
        )
      JOIN courses c ON cs1.course_id = c.id
      JOIN facilities f ON cs1.facility_id = f.id
      WHERE cs1.semester = $1 AND cs1.academic_year = $2
        AND cs1.status != 'CANCELLED' AND cs2.status != 'CANCELLED'
      ${department_id ? 'AND c.department_id = $3' : ''}
      GROUP BY f.name, cs1.day_of_week, cs1.start_time, cs1.end_time
    `;

    const queryParams = [semester, academic_year];
    if (department_id) queryParams.push(department_id);

    const [instructorConflicts, facilityConflicts] = await Promise.all([
      pool.query(instructorConflictsQuery, queryParams),
      pool.query(facilityConflictsQuery, queryParams)
    ]);

    res.json({
      success: true,
      data: {
        instructor_conflicts: instructorConflicts.rows,
        facility_conflicts: facilityConflicts.rows,
        summary: {
          total_instructor_conflicts: instructorConflicts.rows.length,
          total_facility_conflicts: facilityConflicts.rows.length
        }
      }
    });

  } catch (error) {
    console.error('Conflicts check error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check for conflicts'
    });
  }
});

/**
 * PUT /api/schedules/:id
 * Update a course schedule
 */
router.put('/:id', [
  authenticateToken,
  body('instructor_id').optional().isInt(),
  body('facility_id').optional().isInt(),
  body('day_of_week').optional().isInt({ min: 0, max: 6 }),
  body('start_time').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  body('end_time').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  body('enrollment_actual').optional().isInt({ min: 0 }),
  body('status').optional().isIn(['SCHEDULED', 'ACTIVE', 'COMPLETED', 'CANCELLED'])
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

    // Get current schedule for conflict checking
    const currentSchedule = await pool.query('SELECT * FROM course_schedules WHERE id = $1', [id]);
    if (currentSchedule.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
    }

    const current = currentSchedule.rows[0];

    // Check for conflicts if time/resource changes
    if (updates.instructor_id || updates.facility_id || updates.day_of_week || updates.start_time || updates.end_time) {
      const conflicts = await checkScheduleConflicts(
        updates.instructor_id || current.instructor_id,
        updates.facility_id || current.facility_id,
        updates.day_of_week || current.day_of_week,
        updates.start_time || current.start_time,
        updates.end_time || current.end_time,
        current.semester,
        current.academic_year,
        id // Exclude current schedule from conflict check
      );

      if (conflicts.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'Schedule conflicts detected',
          conflicts: conflicts
        });
      }
    }

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
      UPDATE course_schedules 
      SET ${setClause.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, queryParams);

    res.json({
      success: true,
      message: 'Schedule updated successfully',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Schedule update error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update schedule'
    });
  }
});

/**
 * DELETE /api/schedules/:id
 * Cancel a course schedule
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      UPDATE course_schedules 
      SET status = 'CANCELLED', updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
    }

    res.json({
      success: true,
      message: 'Schedule cancelled successfully',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Schedule cancellation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel schedule'
    });
  }
});

/**
 * POST /api/schedules/:id/assign-users
 * Assign users to a course schedule
 */
router.post('/:id/assign-users', [
  authenticateToken,
  body('user_ids').isArray()
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
    const { user_ids } = req.body;

    // Verify schedule exists
    const scheduleCheck = await pool.query('SELECT * FROM course_schedules WHERE id = $1', [id]);
    if (scheduleCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
    }

    // Clear existing assignments
    await pool.query('DELETE FROM course_enrollments WHERE schedule_id = $1', [id]);

    // Add new assignments
    if (user_ids.length > 0) {
      const insertQuery = `
        INSERT INTO course_enrollments (schedule_id, user_id, enrollment_date, status)
        VALUES ${user_ids.map((_, index) => `($1, $${index + 2}, CURRENT_DATE, 'ENROLLED')`).join(', ')}
      `;
      await pool.query(insertQuery, [id, ...user_ids]);
    }

    res.json({
      success: true,
      message: 'Users assigned successfully',
      assigned_count: user_ids.length
    });

  } catch (error) {
    console.error('User assignment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign users'
    });
  }
});

/**
 * GET /api/schedules/user/:userId
 * Get schedules for a specific user
 */
router.get('/user/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;

    const query = `
      SELECT 
        cs.*,
        c.name as course_name,
        u.first_name || ' ' || u.last_name as instructor_name,
        f.name as facility_name,
        f.type as facility_type,
        d.name as department_name,
        ce.enrollment_date,
        ce.status as enrollment_status
      FROM course_schedules cs
      JOIN course_enrollments ce ON cs.id = ce.schedule_id
      JOIN courses c ON cs.course_id = c.id
      JOIN departments d ON c.department_id = d.id
      LEFT JOIN users u ON cs.instructor_id = u.id
      LEFT JOIN facilities f ON cs.facility_id = f.id
      WHERE ce.user_id = $1 AND ce.status = 'ENROLLED' AND cs.status != 'CANCELLED'
      ORDER BY cs.day_of_week, cs.start_time
    `;

    const result = await pool.query(query, [userId]);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('User schedules fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user schedules'
    });
  }
});

// Helper function to check for schedule conflicts
async function checkScheduleConflicts(instructorId, facilityId, dayOfWeek, startTime, endTime, semester, academicYear, excludeId = null) {
  const conflicts = [];

  // Check instructor conflicts
  if (instructorId) {
    let instructorQuery = `
      SELECT cs.*, c.name as course_name
      FROM course_schedules cs
      JOIN courses c ON cs.course_id = c.id
      WHERE cs.instructor_id = $1 
        AND cs.day_of_week = $2 
        AND cs.semester = $3 
        AND cs.academic_year = $4
        AND cs.status != 'CANCELLED'
        AND (
          (cs.start_time <= $5 AND cs.end_time > $5) OR
          (cs.start_time < $6 AND cs.end_time >= $6) OR
          (cs.start_time >= $5 AND cs.end_time <= $6)
        )
    `;
    const params = [instructorId, dayOfWeek, semester, academicYear, startTime, endTime];

    if (excludeId) {
      instructorQuery += ' AND cs.id != $7';
      params.push(excludeId);
    }

    const instructorConflicts = await pool.query(instructorQuery, params);
    
    if (instructorConflicts.rows.length > 0) {
      conflicts.push({
        type: 'instructor',
        resource_id: instructorId,
        conflicting_schedules: instructorConflicts.rows
      });
    }
  }

  // Check facility conflicts
  if (facilityId) {
    let facilityQuery = `
      SELECT cs.*, c.name as course_name
      FROM course_schedules cs
      JOIN courses c ON cs.course_id = c.id
      WHERE cs.facility_id = $1 
        AND cs.day_of_week = $2 
        AND cs.semester = $3 
        AND cs.academic_year = $4
        AND cs.status != 'CANCELLED'
        AND (
          (cs.start_time <= $5 AND cs.end_time > $5) OR
          (cs.start_time < $6 AND cs.end_time >= $6) OR
          (cs.start_time >= $5 AND cs.end_time <= $6)
        )
    `;
    const params = [facilityId, dayOfWeek, semester, academicYear, startTime, endTime];

    if (excludeId) {
      facilityQuery += ' AND cs.id != $7';
      params.push(excludeId);
    }

    const facilityConflicts = await pool.query(facilityQuery, params);
    
    if (facilityConflicts.rows.length > 0) {
      conflicts.push({
        type: 'facility',
        resource_id: facilityId,
        conflicting_schedules: facilityConflicts.rows
      });
    }
  }

  return conflicts;
}

module.exports = router;
