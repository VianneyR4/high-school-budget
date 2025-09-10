# Enhanced School Budget Management System

A comprehensive web application for managing high school budgets, course allocations, resource optimization, and advanced financial modeling with AI-powered optimization algorithms.

## Enhanced Features

### **Phase 1: Advanced User Management**
- **Extended Role Hierarchy**: Admin > Department Head > Teacher > User
- **Enhanced User Profiles**: Contact info, qualifications, employment types, hire dates
- **Instructor Management**: Availability tracking, workload optimization

### **Phase 2: Resource Optimization Engine**
- **AI-Powered Optimization**: Mathematical models for optimal resource distribution
- **Smart Resource Allocation**: Instructor-facility-course matching algorithms
- **Cost Calculation Engine**: Advanced cost structures with differentials and depreciation
- **Multiple Optimization Strategies**: Cost minimization, utilization maximization, balanced approach

### **Phase 3: Advanced Financial Modeling**
- **Complex Cost Structures**: Instructor differentials, facility overhead, equipment depreciation
- **Budget Forecasting**: Multi-scenario projections with confidence intervals
- **Variance Analysis**: Real-time budget vs. actual tracking
- **Cost-per-Credit-Hour Calculator**: Detailed financial metrics

### **Phase 4: Temporal Scheduling System**
- **Academic Calendar Integration**: Semester management with scheduling constraints
- **Conflict Prevention**: Automated detection of instructor and facility conflicts
- **Room Assignment Optimization**: Capacity and resource matching
- **Equipment Reservation System**: Time-based equipment booking

### **Phase 5: Advanced Reporting & Analytics**
- **Comprehensive Dashboards**: Cross-departmental utilization metrics
- **Trend Analysis**: Historical data analysis with predictive modeling
- **Export Capabilities**: PDF, CSV, and Excel report generation
- **Visualization Charts**: Interactive analytics and graphs

## Technology Stack

- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL with advanced schema
- **Authentication**: JWT, bcrypt
- **Frontend**: React.js (separate client app)
- **Security**: Helmet, CORS, Rate limiting
- **Analytics**: Custom optimization algorithms
- **Reporting**: PDF generation, CSV export
- **Mathematical Models**: Linear programming, genetic algorithms

## Enhanced Project Structure

```
school-budget-demo/
├── config/
│   └── database.js              # Database configuration
├── database/
│   ├── schema.sql              # Enhanced database schema
│   └── sample_data.sql         # Comprehensive sample data
├── middleware/
│   └── auth.js                 # Authentication middleware
├── models/                     # NEW: Optimization algorithms
│   ├── OptimizationAlgorithm.js # Core optimization logic
│   ├── CostCalculator.js       # Advanced cost calculations
│   └── ResourceAllocator.js    # Smart resource distribution
├── routes/
│   ├── auth.js                 # Authentication routes
│   ├── departments.js          # Department management
│   ├── courses.js              # Course management
│   ├── transfers.js            # Budget transfer routes
│   ├── metrics.js              # Analytics endpoints
│   ├── optimization.js         # NEW: Optimization API
│   ├── facilities.js           # NEW: Facility management
│   ├── equipment.js            # NEW: Equipment & depreciation
│   ├── scheduling.js           # NEW: Course scheduling
│   ├── reports.js              # NEW: Advanced reporting
│   └── forecasting.js          # NEW: Budget forecasting
├── client/                     # React frontend application
├── server.js                   # Enhanced main server
├── package.json               # Updated dependencies
└── README.md                  # This enhanced documentation
```

## Test Accounts

The system comes with pre-configured test accounts for all user roles:

| Email | Password | Role | Department | Access Level |
|-------|----------|------|------------|--------------|
| admin@school.edu | password | ADMIN | All Departments | Full system access |
| math.head@school.edu | password | DEPARTMENT_HEAD | Mathematics | Department management |
| science.head@school.edu | password | DEPARTMENT_HEAD | Science | Department management |
| english.head@school.edu | password | DEPARTMENT_HEAD | English | Department management |
| alice.smith@school.edu | password | TEACHER | Mathematics | Course scheduling & resources |
| bob.wilson@school.edu | password | TEACHER | Science | Course scheduling & resources |
| user@school.edu | password | USER | Mathematics | Basic access & reporting |

### Role Hierarchy & Permissions:
- **ADMIN**: Complete system access, all departments, optimization algorithms
- **DEPARTMENT_HEAD**: Department budget management, course oversight, reporting
- **TEACHER**: Course scheduling, resource requests, availability management
- **USER**: Basic reporting, limited resource viewing

## Security Features
- JWT token authentication
- Role-based access control
- Rate limiting on API endpoints
- Input validation and sanitization
- Secure password hashing

## Development

### Quick Start Guide

1. **Start the server**: `npm run dev`
2. **Access the API**: http://localhost:3001
3. **Login with test accounts** (see Test Accounts section above)
4. **Test endpoints** using the browser preview or API client

### Frontend Development

The React frontend is located in the `client/` directory with the following structure:

```
client/
├── src/
│   ├── components/       # Reusable UI components
│   ├── pages/           # Page components
│   ├── contexts/        # React contexts for state management
│   └── App.js          # Main application component
├── public/             # Static assets
└── package.json        # Frontend dependencies
```

### Building for Production
```bash
# Build frontend
cd client && npm run build

# Start production server
npm start
```

## License
MIT License - Educational project for demonstrating budget management concepts.