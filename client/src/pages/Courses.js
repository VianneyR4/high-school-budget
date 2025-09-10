import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Alert,
  CircularProgress,
  Chip
} from '@mui/material';
import { Add } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const Courses = () => {
  const { user, isAdmin, isDepartmentHead } = useAuth();
  const [courses, setCourses] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    department_id: '',
    expected_students: '',
    instructor_cost: '',
    classroom_cost: ''
  });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [coursesResponse, departmentsResponse] = await Promise.all([
        axios.get('http://localhost:3001/api/courses'),
        axios.get('http://localhost:3001/api/departments')
      ]);
      
      setCourses(coursesResponse.data.data);
      setDepartments(departmentsResponse.data.data);
    } catch (err) {
      setError('Failed to load courses data');
      console.error('Courses error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = () => {
    setFormData({
      name: '',
      department_id: isDepartmentHead() ? user.department_id : '',
      expected_students: '',
      instructor_cost: '',
      classroom_cost: ''
    });
    setFormError('');
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setFormData({
      name: '',
      department_id: '',
      expected_students: '',
      instructor_cost: '',
      classroom_cost: ''
    });
    setFormError('');
  };

  const handleInputChange = (field) => (event) => {
    setFormData({
      ...formData,
      [field]: event.target.value
    });
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      setFormError('');

      const response = await axios.post('http://localhost:3001/api/courses', {
        name: formData.name,
        department_id: parseInt(formData.department_id),
        expected_students: parseInt(formData.expected_students),
        instructor_cost: parseFloat(formData.instructor_cost),
        classroom_cost: parseFloat(formData.classroom_cost)
      });

      if (response.data.success) {
        await fetchData();
        handleCloseDialog();
      }
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to create course');
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getCostPerStudent = (course) => {
    if (course.expected_students === 0) return 'N/A';
    return formatCurrency(course.total_cost / course.expected_students);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">
          Courses Budget Plannings
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={handleOpenDialog}
        >
          Add Course
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Course Name</TableCell>
              {isAdmin() && <TableCell>Department</TableCell>}
              <TableCell align="right">Expected Students</TableCell>
              <TableCell align="right">Instructor Cost</TableCell>
              <TableCell align="right">Classroom Cost</TableCell>
              <TableCell align="right">Total Cost</TableCell>
              <TableCell align="right">Cost per Student</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {courses.map((course) => (
              <TableRow key={course.id}>
                <TableCell>
                  <Typography variant="body1" fontWeight="medium">
                    {course.name}
                  </Typography>
                </TableCell>
                {isAdmin() && (
                  <TableCell>
                    <Chip label={course.department_name} size="small" />
                  </TableCell>
                )}
                <TableCell align="right">{course.expected_students}</TableCell>
                <TableCell align="right">{formatCurrency(course.instructor_cost)}</TableCell>
                <TableCell align="right">{formatCurrency(course.classroom_cost)}</TableCell>
                <TableCell align="right">
                  <Typography fontWeight="medium">
                    {formatCurrency(course.total_cost)}
                  </Typography>
                </TableCell>
                <TableCell align="right">{getCostPerStudent(course)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Course Cost Explanation */}
      <Alert severity="info" sx={{ mb: 4 }}>
        <Typography variant="subtitle2" gutterBottom>
          💰 Course Cost Analysis - Formula Explanation:
        </Typography>
        <Typography variant="body2" component="div">
          • <strong>Expected Students:</strong> Projected enrollment for the course (used for planning and cost calculations)<br/>
          • <strong>Instructor Cost:</strong> Cost for teaching staff (salary, benefits, hourly rates)<br/>
          • <strong>Classroom Cost:</strong> Facility usage, utilities, equipment, and maintenance costs<br/>
          • <strong>Total Cost:</strong> Instructor Cost + Classroom Cost (automatically calculated)<br/>
          • <strong>Cost per Student:</strong> Total Cost ÷ Expected Students (efficiency metric for course planning)
        </Typography>
      </Alert>

      {/* Add Course Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Course</DialogTitle>
        <DialogContent>
          {formError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {formError}
            </Alert>
          )}
          
          <TextField
            autoFocus
            margin="dense"
            label="Course Name"
            fullWidth
            variant="outlined"
            value={formData.name}
            onChange={handleInputChange('name')}
            sx={{ mb: 2 }}
          />
          
          {isAdmin() && (
            <TextField
              select
              margin="dense"
              label="Department"
              fullWidth
              variant="outlined"
              value={formData.department_id}
              onChange={handleInputChange('department_id')}
              sx={{ mb: 2 }}
            >
              {departments.map((dept) => (
                <MenuItem key={dept.id} value={dept.id}>
                  {dept.name}
                </MenuItem>
              ))}
            </TextField>
          )}
          
          <TextField
            margin="dense"
            label="Expected Students"
            type="number"
            fullWidth
            variant="outlined"
            value={formData.expected_students}
            onChange={handleInputChange('expected_students')}
            sx={{ mb: 2 }}
          />
          
          <TextField
            margin="dense"
            label="Instructor Cost"
            type="number"
            fullWidth
            variant="outlined"
            value={formData.instructor_cost}
            onChange={handleInputChange('instructor_cost')}
            sx={{ mb: 2 }}
          />
          
          <TextField
            margin="dense"
            label="Classroom Cost"
            type="number"
            fullWidth
            variant="outlined"
            value={formData.classroom_cost}
            onChange={handleInputChange('classroom_cost')}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained"
            disabled={submitting}
          >
            {submitting ? <CircularProgress size={24} /> : 'Add Course'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Courses;
