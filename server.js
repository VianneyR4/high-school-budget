const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const departmentRoutes = require('./routes/departments');
const courseRoutes = require('./routes/courses');
const transferRoutes = require('./routes/transfers');
const metricsRoutes = require('./routes/metrics');
const optimizationRoutes = require('./routes/optimization');
const facilitiesRoutes = require('./routes/facilities');
const equipmentRoutes = require('./routes/equipment');
const schedulingRoutes = require('./routes/scheduling');
const reportsRoutes = require('./routes/reports');
const forecastingRoutes = require('./routes/forecasting');
const usersRoutes = require('./routes/users');

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/transfers', transferRoutes);
app.use('/api/metrics', metricsRoutes);
app.use('/api/optimization', optimizationRoutes);
app.use('/api/facilities', facilitiesRoutes);
app.use('/api/equipment', equipmentRoutes);
app.use('/api/schedules', schedulingRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/forecasting', forecastingRoutes);
app.use('/api/users', usersRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'School Budget Management API'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    success: false, 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'Route not found' 
  });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 School Budget Management API`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
});
