import React, { useState, useEffect } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Chip
} from '@mui/material';
import {
  AccountBalance,
  School,
  TrendingUp,
  People
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const Dashboard = () => {
  const { user, isAdmin } = useAuth();
  const [departments, setDepartments] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [deptResponse, summaryResponse] = await Promise.all([
        axios.get('http://localhost:3001/api/departments'),
        isAdmin() ? axios.get('http://localhost:3001/api/metrics/summary') : Promise.resolve(null)
      ]);

      setDepartments(deptResponse.data.data);
      if (summaryResponse) {
        setSummary(summaryResponse.data.data);
      }
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error('Dashboard error:', err);
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
        Dashboard
      </Typography>
      <Typography variant="body1" color="text.secondary" gutterBottom>
        Welcome back, {user?.email}
      </Typography>

      {/* Summary Cards for Admin */}
      {isAdmin() && summary && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <AccountBalance color="primary" sx={{ mr: 2 }} />
                  <Box>
                    <Typography color="text.secondary" gutterBottom>
                      Total Budget
                    </Typography>
                    <Typography variant="h5">
                      {formatCurrency(summary.total_budget)}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <School color="success" sx={{ mr: 2 }} />
                  <Box>
                    <Typography color="text.secondary" gutterBottom>
                      Total Courses
                    </Typography>
                    <Typography variant="h5">
                      {summary.total_courses}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <People color="info" sx={{ mr: 2 }} />
                  <Box>
                    <Typography color="text.secondary" gutterBottom>
                      Total Students
                    </Typography>
                    <Typography variant="h5">
                      {summary.total_students}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <TrendingUp color="warning" sx={{ mr: 2 }} />
                  <Box>
                    <Typography color="text.secondary" gutterBottom>
                      Utilization
                    </Typography>
                    <Typography variant="h5">
                      {summary.utilization_percentage}%
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Department Cards */}
      <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
        {isAdmin() ? 'All Departments' : 'Your Department'}
      </Typography>
      
      <Grid container spacing={3}>
        {departments.map((dept) => {
          const utilization = dept.budget > 0 ? (dept.total_allocated / dept.budget) * 100 : 0;
          const remaining = dept.budget - dept.total_allocated;
          
          return (
            <Grid item xs={12} md={6} lg={4} key={dept.id}>
              <Card>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
                    <Typography variant="h6">
                      {dept.name}
                    </Typography>
                    <Chip
                      label={`${utilization.toFixed(1)}%`}
                      color={utilization > 90 ? 'error' : utilization > 70 ? 'warning' : 'success'}
                      size="small"
                    />
                  </Box>
                  
                  <Box mb={2}>
                    <Typography variant="body2" color="text.secondary">
                      Total Budget
                    </Typography>
                    <Typography variant="h6">
                      {formatCurrency(dept.budget)}
                    </Typography>
                  </Box>
                  
                  <Box mb={2}>
                    <Typography variant="body2" color="text.secondary">
                      Allocated
                    </Typography>
                    <Typography variant="body1">
                      {formatCurrency(dept.total_allocated)}
                    </Typography>
                  </Box>
                  
                  <Box mb={2}>
                    <Typography variant="body2" color="text.secondary">
                      Remaining
                    </Typography>
                    <Typography 
                      variant="body1" 
                      color={remaining < 0 ? 'error' : 'success'}
                    >
                      {formatCurrency(remaining)}
                    </Typography>
                  </Box>
                  
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Courses
                    </Typography>
                    <Typography variant="body1">
                      {dept.course_count} courses
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
};

export default Dashboard;
