# School Budget Management System

A simplified high school budget management system built with Node.js/Express backend and React frontend. This system allows administrators and department heads to manage department budgets, courses, and resource allocation.

## Features

### Core Functionality
- **JWT Authentication** with role-based access (ADMIN, DEPARTMENT_HEAD)
- **Department Budget Management** with real-time tracking
- **Course Management** with cost calculations
- **Budget Transfer System** between departments
- **Metrics & Analytics** for cost per student and utilization

### User Roles
- **ADMIN**: Can view all departments, manage all courses, and see comprehensive metrics
- **DEPARTMENT_HEAD**: Can manage only their department's courses and transfer budget

## Tech Stack

### Backend
- Node.js with Express.js
- PostgreSQL database
- JWT authentication
- bcryptjs for password hashing
- Rate limiting and security middleware

### Frontend
- React 19
- Material-UI (MUI) components
- React Router for navigation
- Axios for API calls
- Context API for state management

## Quick Start

### Prerequisites
- Node.js 16+
- PostgreSQL 12+
- npm or yarn

### Database Setup
1. Create PostgreSQL database:
   ```bash
   createdb school_budget
   ```

2. Run the schema:
   ```bash
   psql -d school_budget -f database/schema.sql
   ```

### Backend Setup
1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment:
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

3. Start the server:
   ```bash
   npm run dev
   ```

The backend will run on http://localhost:3001

### Frontend Setup
1. Navigate to client directory:
   ```bash
   cd client
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the React app:
   ```bash
   npm start
   ```

The frontend will run on http://localhost:3000

### Full Development Setup
Run both backend and frontend simultaneously:
```bash
npm run dev:full
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login

### Departments
- `GET /api/departments` - Get departments (role-based access)
- `GET /api/departments/:id` - Get single department

### Courses
- `GET /api/courses` - Get courses (role-based access)
- `POST /api/courses` - Create new course
- `GET /api/courses/:id` - Get single course

### Transfers
- `GET /api/transfers` - Get budget transfers (role-based access)
- `POST /api/transfers` - Create budget transfer

### Metrics
- `GET /api/metrics/cost-per-student` - Cost per student analysis
- `GET /api/metrics/utilization` - Budget utilization metrics
- `GET /api/metrics/summary` - Overall summary (admin only)

## Database Schema

### Tables
- **users**: User accounts with roles and department assignments
- **departments**: Department information and budgets
- **courses**: Course details with cost calculations
- **transfers**: Budget transfer records

### Sample Data
The system includes sample data with:
- 5 departments (Math, Science, English, History, PE)
- Demo users for each role
- Sample courses with realistic costs

## Demo Accounts

| Role | Email | Password | Department |
|------|-------|----------|------------|
| Admin | admin@school.edu | password123 | All |
| Dept Head | math.head@school.edu | password123 | Mathematics |
| Dept Head | science.head@school.edu | password123 | Science |
| Dept Head | english.head@school.edu | password123 | English |

## Key Features

### Dashboard
- Department budget overview
- Course count and allocation summary
- Real-time budget utilization
- Role-based data visibility

### Course Management
- Add courses with instructor and classroom costs
- Automatic total cost calculation
- Budget validation before course creation
- Department-specific access control

### Budget Transfers
- Transfer funds between departments
- Transaction history and audit trail
- Reason tracking for transfers
- Real-time budget updates

### Metrics & Analytics
- Cost per student analysis
- Budget utilization percentages
- Department efficiency comparisons
- Visual indicators for budget health

## Security Features
- JWT token authentication
- Role-based access control
- Rate limiting on API endpoints
- Input validation and sanitization
- Secure password hashing

## Development

### Project Structure
```
school-budget-demo/
├── server.js              # Express server entry point
├── config/
│   └── database.js        # PostgreSQL connection
├── middleware/
│   └── auth.js           # Authentication middleware
├── routes/               # API route handlers
├── database/
│   └── schema.sql        # Database schema and sample data
├── client/               # React frontend
│   ├── src/
│   │   ├── components/   # Reusable components
│   │   ├── pages/        # Page components
│   │   └── contexts/     # React contexts
└── package.json
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