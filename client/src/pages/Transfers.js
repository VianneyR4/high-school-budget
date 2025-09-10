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
import { SwapHoriz } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const Transfers = () => {
  const { user, isDepartmentHead } = useAuth();
  const [transfers, setTransfers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [formData, setFormData] = useState({
    to_department_id: '',
    amount: '',
    reason: ''
  });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [transfersResponse, departmentsResponse] = await Promise.all([
        axios.get('http://localhost:3001/api/transfers'),
        axios.get('http://localhost:3001/api/departments')
      ]);
      
      setTransfers(transfersResponse.data.data);
      setDepartments(departmentsResponse.data.data);
    } catch (err) {
      setError('Failed to load transfers data');
      console.error('Transfers error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = () => {
    setFormData({
      to_department_id: '',
      amount: '',
      reason: ''
    });
    setFormError('');
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setFormData({
      to_department_id: '',
      amount: '',
      reason: ''
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

      const response = await axios.post('http://localhost:3001/api/transfers', {
        from_department_id: user.department_id,
        to_department_id: parseInt(formData.to_department_id),
        amount: parseFloat(formData.amount),
        reason: formData.reason
      });

      if (response.data.success) {
        await fetchData();
        handleCloseDialog();
      }
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to create transfer');
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

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getAvailableDepartments = () => {
    return departments.filter(dept => dept.id !== user.department_id);
  };

  const getUserDepartment = () => {
    return departments.find(dept => dept.id === user.department_id);
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

  const userDept = getUserDepartment();

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">
          Budget Transfers
        </Typography>
        {isDepartmentHead() && (
          <Button
            variant="contained"
            startIcon={<SwapHoriz />}
            onClick={handleOpenDialog}
          >
            Transfer Budget
          </Button>
        )}
      </Box>

      {/* Current Department Budget Info */}
      {userDept && (
        <Paper sx={{ p: 2, mb: 3, bgcolor: 'primary.50' }}>
          <Typography variant="h6" gutterBottom>
            Your Department: {userDept.name}
          </Typography>
          <Typography variant="body1">
            Available Budget: <strong>{formatCurrency(userDept.budget)}</strong>
          </Typography>
        </Paper>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>From Department</TableCell>
              <TableCell>To Department</TableCell>
              <TableCell align="right">Amount</TableCell>
              <TableCell>Reason</TableCell>
              <TableCell>Created By</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {transfers.map((transfer) => (
              <TableRow key={transfer.id}>
                <TableCell>{formatDate(transfer.created_at)}</TableCell>
                <TableCell>
                  <Chip 
                    label={transfer.from_department_name} 
                    size="small"
                    color={transfer.from_department_id === user.department_id ? 'error' : 'default'}
                  />
                </TableCell>
                <TableCell>
                  <Chip 
                    label={transfer.to_department_name} 
                    size="small"
                    color={transfer.to_department_id === user.department_id ? 'success' : 'default'}
                  />
                </TableCell>
                <TableCell align="right">
                  <Typography fontWeight="medium">
                    {formatCurrency(transfer.amount)}
                  </Typography>
                </TableCell>
                <TableCell>{transfer.reason || 'No reason provided'}</TableCell>
                <TableCell>{transfer.created_by_email}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Transfer Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Transfer Budget</DialogTitle>
        <DialogContent>
          {formError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {formError}
            </Alert>
          )}
          
          <Alert severity="info" sx={{ mb: 2 }}>
            Transferring from: <strong>{userDept?.name}</strong>
            <br />
            Available budget: <strong>{formatCurrency(userDept?.budget || 0)}</strong>
          </Alert>
          
          <TextField
            select
            margin="dense"
            label="To Department"
            fullWidth
            variant="outlined"
            value={formData.to_department_id}
            onChange={handleInputChange('to_department_id')}
            sx={{ mb: 2 }}
          >
            {getAvailableDepartments().map((dept) => (
              <MenuItem key={dept.id} value={dept.id}>
                {dept.name}
              </MenuItem>
            ))}
          </TextField>
          
          <TextField
            margin="dense"
            label="Amount"
            type="number"
            fullWidth
            variant="outlined"
            value={formData.amount}
            onChange={handleInputChange('amount')}
            sx={{ mb: 2 }}
            inputProps={{ min: 0.01, step: 0.01 }}
          />
          
          <TextField
            margin="dense"
            label="Reason (Optional)"
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            value={formData.reason}
            onChange={handleInputChange('reason')}
            placeholder="Explain the reason for this budget transfer..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained"
            disabled={submitting}
          >
            {submitting ? <CircularProgress size={24} /> : 'Transfer Budget'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Transfers;
