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
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Alert,
  CircularProgress,
  Chip,
  IconButton,
  Tooltip
} from '@mui/material';
import { Edit, AdminPanelSettings, School, Person, Work } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const AdminRoleManagement = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState({
    role: '',
    department_id: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const roles = [
    { value: 'ADMIN', label: 'Administrator', icon: <AdminPanelSettings />, color: 'error' },
    { value: 'DEPARTMENT_HEAD', label: 'Department Head', icon: <Work />, color: 'warning' },
    { value: 'TEACHER', label: 'Teacher', icon: <School />, color: 'success' },
    { value: 'USER', label: 'User', icon: <Person />, color: 'info' }
  ];

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [usersResponse, departmentsResponse] = await Promise.all([
        axios.get('http://localhost:3001/api/users'),
        axios.get('http://localhost:3001/api/departments')
      ]);
      
      setUsers(usersResponse.data.data || []);
      setDepartments(departmentsResponse.data.data || []);
    } catch (err) {
      setError('Failed to load users data');
      console.error('Users error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditRole = (userToEdit) => {
    setSelectedUser(userToEdit);
    setFormData({
      role: userToEdit.role,
      department_id: userToEdit.department_id || ''
    });
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedUser(null);
    setFormData({ role: '', department_id: '' });
  };

  const handleUpdateRole = async () => {
    try {
      setSubmitting(true);
      const response = await axios.put(`http://localhost:3001/api/users/${selectedUser.id}/role`, {
        role: formData.role,
        department_id: formData.department_id || null
      });
      
      if (response.data.success) {
        await fetchData();
        handleCloseDialog();
      }
    } catch (err) {
      setError('Failed to update user role');
    } finally {
      setSubmitting(false);
    }
  };

  const getRoleInfo = (role) => {
    return roles.find(r => r.value === role) || roles[3];
  };

  const getDepartmentName = (departmentId) => {
    const dept = departments.find(d => d.id === departmentId);
    return dept ? dept.name : 'No Department';
  };

  if (user?.role !== 'ADMIN') {
    return (
      <Alert severity="error">
        Access denied. Only administrators can manage user roles.
      </Alert>
    );
  }

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
        User Role Management
      </Typography>
      
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Manage user roles and department assignments across the system
      </Typography>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>User</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Current Role</TableCell>
              <TableCell>Department</TableCell>
              <TableCell>Employment</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((userItem) => {
              const roleInfo = getRoleInfo(userItem.role);
              return (
                <TableRow key={userItem.id}>
                  <TableCell>
                    <Box display="flex" alignItems="center">
                      {roleInfo.icon}
                      <Box ml={1}>
                        <Typography variant="subtitle2">
                          {userItem.first_name} {userItem.last_name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          ID: {userItem.id}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>{userItem.email}</TableCell>
                  <TableCell>
                    <Chip 
                      label={roleInfo.label}
                      color={roleInfo.color}
                      size="small"
                      icon={roleInfo.icon}
                    />
                  </TableCell>
                  <TableCell>
                    {getDepartmentName(userItem.department_id)}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {userItem.employment_type || 'N/A'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {userItem.hire_date ? new Date(userItem.hire_date).toLocaleDateString() : 'N/A'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Tooltip title="Edit Role">
                      <IconButton 
                        onClick={() => handleEditRole(userItem)}
                        size="small"
                      >
                        <Edit />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Edit Role Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          Edit User Role: {selectedUser?.first_name} {selectedUser?.last_name}
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Current: {selectedUser && getRoleInfo(selectedUser.role).label}
          </Alert>
          
          <TextField
            select
            fullWidth
            label="New Role"
            value={formData.role}
            onChange={(e) => setFormData({...formData, role: e.target.value})}
            margin="normal"
            required
          >
            {roles.map((role) => (
              <MenuItem key={role.value} value={role.value}>
                <Box display="flex" alignItems="center">
                  {role.icon}
                  <Box ml={1}>
                    {role.label}
                  </Box>
                </Box>
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            fullWidth
            label="Department"
            value={formData.department_id}
            onChange={(e) => setFormData({...formData, department_id: e.target.value})}
            margin="normal"
            helperText="Required for Department Heads and Teachers"
          >
            <MenuItem value="">No Department</MenuItem>
            {departments.map((dept) => (
              <MenuItem key={dept.id} value={dept.id}>
                {dept.name}
              </MenuItem>
            ))}
          </TextField>

          <Box mt={2} p={2} bgcolor="grey.50" borderRadius={1}>
            <Typography variant="subtitle2" gutterBottom>
              Role Permissions:
            </Typography>
            {formData.role && (
              <Typography variant="body2" color="text.secondary">
                {formData.role === 'ADMIN' && 'Full system access, all departments, user management'}
                {formData.role === 'DEPARTMENT_HEAD' && 'Department budget management, course oversight, reporting'}
                {formData.role === 'TEACHER' && 'Course scheduling, resource requests, user assignment'}
                {formData.role === 'USER' && 'Basic access, view assigned courses only'}
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button 
            onClick={handleUpdateRole} 
            disabled={submitting || !formData.role}
            variant="contained"
          >
            {submitting ? <CircularProgress size={20} /> : 'Update Role'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminRoleManagement;
