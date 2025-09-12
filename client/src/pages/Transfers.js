import React, { useState, useEffect, use } from 'react';
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
  const { user, isDepartmentHead, isAdmin } = useAuth();
  const [transfers, setTransfers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [formData, setFormData] = useState({
    from_department_id: '',
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
      from_department_id: user.department_id, // Always default to user's department
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
      from_department_id: '',
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
        from_department_id: parseInt(formData.from_department_id),
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


  const getUserDepartment = () => {
    return departments.find(dept => dept.id === user.department_id);
  };

  const getSelectedFromDepartment = () => {
    return departments.find(dept => dept.id === parseInt(formData.from_department_id));
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
        {(isDepartmentHead() || isAdmin()) && (
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
      {userDept && !isAdmin() && (
        <Paper sx={{ p: 2, mb: 3, bgcolor: 'primary.50' }}>
          <Typography variant="h6" gutterBottom>
            {isAdmin() && openDialog && formData.from_department_id && getSelectedFromDepartment() 
              ? `Selected Department: ${getSelectedFromDepartment().name}`
              : `Your Department: ${userDept.name}`
            }
          </Typography>
          <Typography variant="body1">
            Available Budget: <strong>
              {formatCurrency(
                isAdmin() && openDialog && formData.from_department_id && getSelectedFromDepartment()
                  ? getSelectedFromDepartment().budget
                  : userDept.budget
              )}
            </strong>
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

      {/* Budget Transfer Explanation */}
      <Alert severity="info" sx={{ mb: 4 }}>
        <Typography variant="subtitle2" gutterBottom>
          💸 Budget Transfer Analysis - Data Explanation:
        </Typography>
        <Typography variant="body2" component="div">
          • <strong>Date:</strong> When the transfer was created and processed<br/>
          • <strong>From Department:</strong> Source department losing budget funds (highlighted in red if your department)<br/>
          • <strong>To Department:</strong> Destination department receiving budget funds (highlighted in green if your department)<br/>
          • <strong>Amount:</strong> Dollar amount transferred between departments<br/>
          • <strong>Reason:</strong> Justification or purpose for the budget transfer<br/>
          • <strong>Created By:</strong> User who initiated and approved the transfer
        </Typography>
      </Alert>

      {/* Transfer Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Transfer Budget</DialogTitle>
        <DialogContent>
          {formError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {formError}
            </Alert>
          )}
          
          {formData.from_department_id && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Transferring from: <strong>
                {isAdmin() 
                  ? (getSelectedFromDepartment()?.name || 'Select department')
                  : userDept?.name
                }
              </strong>
              <br />
              Available budget: <strong>
                {formatCurrency(
                  isAdmin() 
                    ? (getSelectedFromDepartment()?.budget || 0)
                    : (userDept?.budget || 0)
                )}
              </strong>
            </Alert>
          )}
          
          {isAdmin() ? (
            <TextField
              select
              fullWidth
              label="Transfer From Department"
              value={formData.from_department_id}
              onChange={handleInputChange('from_department_id')}
              margin="normal"
              required
            >
              {departments.map((dept) => (
                <MenuItem key={dept.id} value={dept.id}>
                  {dept.name} (Available Budget: ${dept.budget?.toLocaleString() || 'N/A'})
                </MenuItem>
              ))}
            </TextField>
          ) : (
            <TextField
              fullWidth
              label="Transfer From Department"
              value={userDept?.name || ''}
              margin="normal"
              disabled
              helperText="You can only transfer from your own department"
            />
          )}

          <TextField
            select
            fullWidth
            label="Transfer To Department"
            value={formData.to_department_id}
            onChange={handleInputChange('to_department_id')}
            margin="normal"
            required
          >
            {departments
              .filter(dept => dept.id !== (isAdmin() ? parseInt(formData.from_department_id) : user.department_id))
              .map((dept) => (
              <MenuItem key={dept.id} value={dept.id}>
                {dept.name} (Available Budget: ${dept.budget?.toLocaleString() || 'N/A'})
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
