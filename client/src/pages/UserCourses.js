import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  CircularProgress,
  Chip,
  Card,
  CardContent,
  Grid
} from '@mui/material';
import { School, Schedule, Person, LocationOn } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const UserCourses = () => {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  useEffect(() => {
    fetchUserCourses();
  }, []);

  const fetchUserCourses = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`http://localhost:3001/api/schedules/user/${user.id}`);
      setCourses(response.data.data || []);

      console.log("====== User courses: ", response.data);
    } catch (err) {
      setError('Failed to load your courses');
      console.error('User courses error:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (time) => {
    return new Date(`1970-01-01T${time}`).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'ACTIVE': return 'success';
      case 'SCHEDULED': return 'info';
      case 'COMPLETED': return 'default';
      case 'CANCELLED': return 'error';
      default: return 'default';
    }
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
      <Typography variant="h4" gutterBottom>
        My Courses
      </Typography>
      
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Courses you are enrolled in for the current semester
      </Typography>

      {courses.length === 0 ? (
        <Card>
          <CardContent>
            <Box display="flex" flexDirection="column" alignItems="center" py={4}>
              <School sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                No courses assigned
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Contact your instructor to be added to courses
              </Typography>
            </Box>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Course Cards Grid */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            {courses.map((course) => (
              <Grid item xs={12} md={6} lg={4} key={course.id}>
                <Card>
                  <CardContent>
                    <Box display="flex" alignItems="center" mb={2}>
                      <School sx={{ mr: 1, color: 'primary.main' }} />
                      <Typography variant="h6" component="div">
                        {course.course_name}
                      </Typography>
                    </Box>
                    
                    <Box display="flex" alignItems="center" mb={1}>
                      <Person sx={{ mr: 1, fontSize: 20, color: 'text.secondary' }} />
                      <Typography variant="body2" color="text.secondary">
                        {course.instructor_name}
                      </Typography>
                    </Box>
                    
                    <Box display="flex" alignItems="center" mb={1}>
                      <Schedule sx={{ mr: 1, fontSize: 20, color: 'text.secondary' }} />
                      <Typography variant="body2" color="text.secondary">
                        {dayNames[course.day_of_week]} {formatTime(course.start_time)} - {formatTime(course.end_time)}
                      </Typography>
                    </Box>
                    
                    <Box display="flex" alignItems="center" mb={2}>
                      <LocationOn sx={{ mr: 1, fontSize: 20, color: 'text.secondary' }} />
                      <Typography variant="body2" color="text.secondary">
                        {course.facility_name}
                      </Typography>
                    </Box>
                    
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Chip 
                        label={course.status || 'ACTIVE'} 
                        size="small" 
                        color={getStatusColor(course.status)}
                      />
                      <Typography variant="caption" color="text.secondary">
                        {course.semester} {course.academic_year}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* Detailed Table View */}
          <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
            Course Schedule Details
          </Typography>
          
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Course</TableCell>
                  <TableCell>Instructor</TableCell>
                  <TableCell>Schedule</TableCell>
                  <TableCell>Location</TableCell>
                  <TableCell>Semester</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {courses.map((course) => (
                  <TableRow key={course.id}>
                    <TableCell>
                      <Typography variant="subtitle2">
                        {course.course_name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {course.course_description}
                      </Typography>
                    </TableCell>
                    <TableCell>{course.instructor_name}</TableCell>
                    <TableCell>
                      {dayNames[course.day_of_week]}
                      <br />
                      <Typography variant="caption">
                        {formatTime(course.start_time)} - {formatTime(course.end_time)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {course.facility_name}
                      <br />
                      <Typography variant="caption" color="text.secondary">
                        {course.facility_type}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {course.semester} {course.academic_year}
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={course.status || 'ACTIVE'} 
                        size="small" 
                        color={getStatusColor(course.status)}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}
    </Box>
  );
};

export default UserCourses;
