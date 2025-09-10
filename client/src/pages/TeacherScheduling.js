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
  Chip,
  FormControl,
  InputLabel,
  Select,
  OutlinedInput,
  Checkbox,
  ListItemText
} from '@mui/material';
import { Add, Schedule, Person } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
  PaperProps: {
    style: {
      maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
      width: 250,
    },
  },
};

const TeacherScheduling = () => {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState([]);
  const [courses, setCourses] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [openAssignDialog, setOpenAssignDialog] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [formData, setFormData] = useState({
    course_id: '',
    facility_id: '',
    day_of_week: '',
    start_time: '',
    end_time: '',
    semester: 'Fall',
    academic_year: new Date().getFullYear()
  });
  const [assignmentData, setAssignmentData] = useState({
    assigned_users: []
  });
  const [submitting, setSubmitting] = useState(false);

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [schedulesRes, coursesRes, facilitiesRes, usersRes] = await Promise.all([
        axios.get(`http://localhost:3001/api/schedules?instructor_id=${user.id}`),
        axios.get(`http://localhost:3001/api/courses?department_id=${user.department_id}`),
        axios.get('http://localhost:3001/api/facilities'),
        axios.get(`http://localhost:3001/api/users?role=USER`)
      ]);
      
      setSchedules(schedulesRes.data.data || []);
      setCourses(coursesRes.data.data || []);
      setFacilities(facilitiesRes.data.data || []);
      setUsers(usersRes.data.data || []);


    } catch (err) {
      setError('Failed to load scheduling data');
      console.error('Scheduling error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSchedule = async () => {
    try {
      setSubmitting(true);
      const response = await axios.post('http://localhost:3001/api/schedules', {
        ...formData,
        instructor_id: user.id,
        day_of_week: parseInt(formData.day_of_week),
        academic_year: parseInt(formData.academic_year)
      });
      
      if (response.data.success) {
        await fetchData();
        setOpenDialog(false);
        setFormData({
          course_id: '',
          facility_id: '',
          day_of_week: '',
          start_time: '',
          end_time: '',
          semester: 'Fall',
          academic_year: new Date().getFullYear()
        });
      }
    } catch (err) {
      setError('Failed to create schedule');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssignUsers = async () => {
    try {
      setSubmitting(true);
      const response = await axios.post(`http://localhost:3001/api/schedules/${selectedSchedule.id}/assign-users`, {
        user_ids: assignmentData.assigned_users
      });
      
      if (response.data.success) {
        await fetchData();
        setOpenAssignDialog(false);
        setAssignmentData({ assigned_users: [] });
        setSelectedSchedule(null);
      }
    } catch (err) {
      setError('Failed to assign users to course');
    } finally {
      setSubmitting(false);
    }
  };

  const openAssignmentDialog = (schedule) => {
    setSelectedSchedule(schedule);
    setAssignmentData({
      assigned_users: schedule.assigned_users || []
    });
    setOpenAssignDialog(true);
  };

  if (loading) {
    return <CircularProgress />;
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">
          Course Scheduling
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setOpenDialog(true)}
        >
          Schedule Course
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Course</TableCell>
              <TableCell>Day</TableCell>
              <TableCell>Time</TableCell>
              <TableCell>Facility</TableCell>
              <TableCell>Semester</TableCell>
              <TableCell>Assigned Users</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {schedules.map((schedule) => (
              <TableRow key={schedule.id}>
                <TableCell>{schedule.course_name}</TableCell>
                <TableCell>{dayNames[schedule.day_of_week]}</TableCell>
                <TableCell>{schedule.start_time} - {schedule.end_time}</TableCell>
                <TableCell>{schedule.facility_name}</TableCell>
                <TableCell>{schedule.semester} {schedule.academic_year}</TableCell>
                <TableCell>
                  <Chip 
                    label={`${schedule.assigned_count || 0} users`}
                    size="small"
                    color={schedule.assigned_count > 0 ? "primary" : "default"}
                  />
                </TableCell>
                <TableCell>
                  <Button
                    size="small"
                    startIcon={<Person />}
                    onClick={() => openAssignmentDialog(schedule)}
                  >
                    Assign Users
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Create Schedule Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Schedule New Course</DialogTitle>
        <DialogContent>
          <TextField
            select
            fullWidth
            label="Course"
            value={formData.course_id}
            onChange={(e) => setFormData({...formData, course_id: e.target.value})}
            margin="normal"
            required
          >
            {courses.map((course) => (
              <MenuItem key={course.id} value={course.id}>
                {course.name}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            fullWidth
            label="Facility"
            value={formData.facility_id}
            onChange={(e) => setFormData({...formData, facility_id: e.target.value})}
            margin="normal"
            required
          >
            {facilities.map((facility) => (
              <MenuItem key={facility.id} value={facility.id}>
                {facility.name} (Capacity: {facility.capacity})
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            fullWidth
            label="Day of Week"
            value={formData.day_of_week}
            onChange={(e) => setFormData({...formData, day_of_week: e.target.value})}
            margin="normal"
            required
          >
            {dayNames.map((day, index) => (
              <MenuItem key={index} value={index}>
                {day}
              </MenuItem>
            ))}
          </TextField>

          <Box display="flex" gap={2}>
            <TextField
              type="time"
              fullWidth
              label="Start Time"
              value={formData.start_time}
              onChange={(e) => setFormData({...formData, start_time: e.target.value})}
              margin="normal"
              InputLabelProps={{ shrink: true }}
              required
            />
            <TextField
              type="time"
              fullWidth
              label="End Time"
              value={formData.end_time}
              onChange={(e) => setFormData({...formData, end_time: e.target.value})}
              margin="normal"
              InputLabelProps={{ shrink: true }}
              required
            />
          </Box>

          <Box display="flex" gap={2}>
            <TextField
              select
              fullWidth
              label="Semester"
              value={formData.semester}
              onChange={(e) => setFormData({...formData, semester: e.target.value})}
              margin="normal"
            >
              <MenuItem value="Fall">Fall</MenuItem>
              <MenuItem value="Spring">Spring</MenuItem>
              <MenuItem value="Summer">Summer</MenuItem>
            </TextField>
            <TextField
              type="number"
              fullWidth
              label="Academic Year"
              value={formData.academic_year}
              onChange={(e) => setFormData({...formData, academic_year: e.target.value})}
              margin="normal"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={handleCreateSchedule} disabled={submitting}>
            {submitting ? <CircularProgress size={20} /> : 'Create Schedule'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Assign Users Dialog */}
      <Dialog open={openAssignDialog} onClose={() => setOpenAssignDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Assign Users to {selectedSchedule?.course_name}
        </DialogTitle>
        <DialogContent>
          <FormControl fullWidth margin="normal">
            <InputLabel>Select Users</InputLabel>
            <Select
              multiple
              value={assignmentData.assigned_users}
              onChange={(e) => setAssignmentData({assigned_users: e.target.value})}
              input={<OutlinedInput label="Select Users" />}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((userId) => {
                    const user = users.find(u => u.id === userId);
                    return (
                      <Chip key={userId} label={user?.first_name + ' ' + user?.last_name} size="small" />
                    );
                  })}
                </Box>
              )}
              MenuProps={MenuProps}
            >
              {users.map((user) => (
                <MenuItem key={user.id} value={user.id}>
                  <Checkbox checked={assignmentData.assigned_users.indexOf(user.id) > -1} />
                  <ListItemText primary={`${user.first_name} ${user.last_name} (${user.email})`} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAssignDialog(false)}>Cancel</Button>
          <Button onClick={handleAssignUsers} disabled={submitting}>
            {submitting ? <CircularProgress size={20} /> : 'Assign Users'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TeacherScheduling;
