import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Container,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Divider,
  Avatar,
  Chip
} from '@mui/material';
import {
  Dashboard,
  School,
  SwapHoriz,
  Analytics,
  Logout,
  AccountBalance,
  Schedule,
  AdminPanelSettings
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

const drawerWidth = 240;

const Layout = ({ children }) => {
  const { user, logout, isAdmin, isDepartmentHead } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    ...(user?.role === 'USER' ? [
      { text: 'My Courses', icon: <School />, path: '/my-courses' }
    ] : [
      { text: 'Dashboard', icon: <Dashboard />, path: '/dashboard' },
      { text: 'Courses', icon: <School />, path: '/courses' }
    ]),
    ...(user?.role === 'TEACHER' ? [
      { text: 'Course Scheduling', icon: <Schedule />, path: '/teacher-scheduling' }
    ] : []),
    ...(isDepartmentHead() || isAdmin() ? [{ text: 'Budget Transfer', icon: <SwapHoriz />, path: '/transfers' }] : []),
    ...(isAdmin() ? [
      { text: 'Role Management', icon: <AdminPanelSettings />, path: '/admin/roles' }
    ] : []),
    { text: 'Metrics', icon: <Analytics />, path: '/metrics' }
  ];

  return (
    <Box sx={{ display: 'flex' }}>
      {/* App Bar */}
      <AppBar
        position="fixed"
        sx={{
          width: `calc(100% - ${drawerWidth}px)`,
          ml: `${drawerWidth}px`,
          bgcolor: 'primary.main'
        }}
      >
        <Toolbar>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            School Budget Management
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Chip
              label={user?.role}
              color={isAdmin() ? 'error' : 'warning'}
              size="small"
            />
            <Typography variant="body2">
              {user?.email}
            </Typography>
            <Button color="inherit" onClick={handleLogout} startIcon={<Logout />}>
              Logout
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Sidebar */}
      <Drawer
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
          },
        }}
        variant="permanent"
        anchor="left"
      >
        <Toolbar>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Avatar sx={{ bgcolor: 'primary.main' }}>
              <AccountBalance />
            </Avatar>
            <Typography variant="h6" color="primary">
              Budget
            </Typography>
          </Box>
        </Toolbar>
        <Divider />
        
        {/* User Info */}
        <Box sx={{ p: 2, bgcolor: 'grey.50' }}>
          <Typography variant="body2" color="text.secondary">
            Department
          </Typography>
          <Typography variant="body1" fontWeight="bold">
            {user?.department_name || isAdmin() ? 'All Departments' : 'No Department'}
          </Typography>
        </Box>
        <Divider />

        {/* Navigation Menu */}
        <List>
          {menuItems.map((item) => (
            <ListItem key={item.text} disablePadding>
              <ListItemButton
                selected={location.pathname === item.path}
                onClick={() => navigate(item.path)}
              >
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Drawer>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          bgcolor: 'background.default',
          p: 3,
          minHeight: '100vh'
        }}
      >
        <Toolbar />
        <Container maxWidth="xl">
          {children}
        </Container>
      </Box>
    </Box>
  );
};

export default Layout;
