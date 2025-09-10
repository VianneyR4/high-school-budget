import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  CircularProgress,
  Chip
} from '@mui/material';
import {
  TrendingUp,
  AccountBalance,
  People,
  School
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const Metrics = () => {
  const { isAdmin } = useAuth();
  const [costPerStudent, setCostPerStudent] = useState([]);
  const [utilization, setUtilization] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const [costResponse, utilizationResponse] = await Promise.all([
        axios.get('http://localhost:3001/api/metrics/cost-per-student'),
        axios.get('http://localhost:3001/api/metrics/utilization')
      ]);
      
      setCostPerStudent(costResponse.data.data);
      setUtilization(utilizationResponse.data.data);
    } catch (err) {
      setError('Failed to load metrics data');
      console.error('Metrics error:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getUtilizationColor = (percentage) => {
    if (percentage >= 90) return 'error';
    if (percentage >= 70) return 'warning';
    return 'success';
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
        Metrics & Analytics
      </Typography>
      <Typography variant="body1" color="text.secondary" gutterBottom>
        Budget utilization and cost analysis
      </Typography>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {costPerStudent.map((dept) => (
          <Grid item xs={12} sm={6} md={4} key={dept.id}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
                  <Typography variant="h6">
                    {dept.department_name}
                  </Typography>
                  <Chip
                    label={`${dept.utilization_percentage || 0}%`}
                    color={getUtilizationColor(dept.utilization_percentage || 0)}
                    size="small"
                  />
                </Box>
                
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Box display="flex" alignItems="center" mb={1}>
                      <AccountBalance fontSize="small" color="primary" sx={{ mr: 1 }} />
                      <Typography variant="body2" color="text.secondary">
                        Budget
                      </Typography>
                    </Box>
                    <Typography variant="body1" fontWeight="medium">
                      {formatCurrency(dept.budget)}
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={6}>
                    <Box display="flex" alignItems="center" mb={1}>
                      <TrendingUp fontSize="small" color="success" sx={{ mr: 1 }} />
                      <Typography variant="body2" color="text.secondary">
                        Allocated
                      </Typography>
                    </Box>
                    <Typography variant="body1" fontWeight="medium">
                      {formatCurrency(dept.total_allocated)}
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={6}>
                    <Box display="flex" alignItems="center" mb={1}>
                      <School fontSize="small" color="info" sx={{ mr: 1 }} />
                      <Typography variant="body2" color="text.secondary">
                        Courses
                      </Typography>
                    </Box>
                    <Typography variant="body1" fontWeight="medium">
                      {dept.course_count}
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={6}>
                    <Box display="flex" alignItems="center" mb={1}>
                      <People fontSize="small" color="warning" sx={{ mr: 1 }} />
                      <Typography variant="body2" color="text.secondary">
                        Students
                      </Typography>
                    </Box>
                    <Typography variant="body1" fontWeight="medium">
                      {dept.total_students}
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Cost per Student Table */}
      <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
        Cost per Student Analysis
      </Typography>
      
      <TableContainer component={Paper} sx={{ mb: 4 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Department</TableCell>
              <TableCell align="right">Total Students</TableCell>
              <TableCell align="right">Total Cost</TableCell>
              <TableCell align="right">Cost per Student</TableCell>
              <TableCell align="center">Efficiency</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {costPerStudent.map((dept) => {
              const efficiency = dept.cost_per_student > 0 ? 
                (dept.cost_per_student < 250 ? 'High' : 
                 dept.cost_per_student < 400 ? 'Medium' : 'Low') : 'N/A';
              
              return (
                <TableRow key={dept.id}>
                  <TableCell>
                    <Typography fontWeight="medium">
                      {dept.department_name}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">{dept.total_students}</TableCell>
                  <TableCell align="right">{formatCurrency(dept.total_allocated)}</TableCell>
                  <TableCell align="right">
                    <Typography fontWeight="medium">
                      {dept.cost_per_student > 0 ? formatCurrency(dept.cost_per_student) : 'N/A'}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={efficiency}
                      color={
                        efficiency === 'High' ? 'success' :
                        efficiency === 'Medium' ? 'warning' : 
                        efficiency === 'Low' ? 'error' : 'default'
                      }
                      size="small"
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Budget Utilization Table */}
      <Typography variant="h5" gutterBottom>
        Budget Utilization
      </Typography>
      
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Department</TableCell>
              <TableCell align="right">Total Budget</TableCell>
              <TableCell align="right">Allocated</TableCell>
              <TableCell align="right">Remaining</TableCell>
              <TableCell align="center">Utilization %</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {utilization.map((dept) => (
              <TableRow key={dept.id}>
                <TableCell>
                  <Typography fontWeight="medium">
                    {dept.department_name}
                  </Typography>
                </TableCell>
                <TableCell align="right">{formatCurrency(dept.budget)}</TableCell>
                <TableCell align="right">{formatCurrency(dept.allocated)}</TableCell>
                <TableCell align="right">
                  <Typography 
                    color={dept.remaining < 0 ? 'error' : 'success'}
                    fontWeight="medium"
                  >
                    {formatCurrency(dept.remaining)}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <Chip
                    label={`${dept.utilization_percentage}%`}
                    color={getUtilizationColor(dept.utilization_percentage)}
                    size="small"
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default Metrics;
