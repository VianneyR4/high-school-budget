import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Courses from './pages/Courses';
import Transfers from './pages/Transfers';
import Metrics from './pages/Metrics';
import TeacherScheduling from './pages/TeacherScheduling';
import UserCourses from './pages/UserCourses';
import AdminRoleManagement from './pages/AdminRoleManagement';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Dashboard />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/courses"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Courses />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/transfers"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Transfers />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/metrics"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Metrics />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/teacher-scheduling"
              element={
                <ProtectedRoute>
                  <Layout>
                    <TeacherScheduling />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-courses"
              element={
                <ProtectedRoute>
                  <Layout>
                    <UserCourses />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/roles"
              element={
                <ProtectedRoute>
                  <Layout>
                    <AdminRoleManagement />
                  </Layout>
                </ProtectedRoute>
              }
            />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
