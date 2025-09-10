-- School Budget Management Database Schema

-- Create database (run this separately)
-- CREATE DATABASE school_budget;

-- Users table with enhanced roles and profile fields
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('ADMIN', 'DEPARTMENT_HEAD', 'TEACHER', 'USER')),
    department_id INTEGER,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    office_location VARCHAR(100),
    qualifications TEXT,
    hire_date DATE,
    employment_type VARCHAR(50) CHECK (employment_type IN ('FULL_TIME', 'PART_TIME', 'ADJUNCT', 'CONTRACT')),
    hourly_rate DECIMAL(8, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Departments table
CREATE TABLE IF NOT EXISTS departments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    budget DECIMAL(12, 2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Courses table
CREATE TABLE IF NOT EXISTS courses (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    department_id INTEGER NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    expected_students INTEGER DEFAULT 0,
    instructor_cost DECIMAL(10, 2) DEFAULT 0.00,
    classroom_cost DECIMAL(10, 2) DEFAULT 0.00,
    total_cost DECIMAL(10, 2) GENERATED ALWAYS AS (instructor_cost + classroom_cost) STORED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Budget transfers table
CREATE TABLE IF NOT EXISTS transfers (
    id SERIAL PRIMARY KEY,
    from_department_id INTEGER NOT NULL REFERENCES departments(id),
    to_department_id INTEGER NOT NULL REFERENCES departments(id),
    amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
    reason VARCHAR(500),
    created_by INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add foreign key constraint for users.department_id
ALTER TABLE users 
ADD CONSTRAINT fk_users_department 
FOREIGN KEY (department_id) REFERENCES departments(id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_department ON users(department_id);
CREATE INDEX IF NOT EXISTS idx_courses_department ON courses(department_id);
CREATE INDEX IF NOT EXISTS idx_transfers_from_dept ON transfers(from_department_id);
CREATE INDEX IF NOT EXISTS idx_transfers_to_dept ON transfers(to_department_id);

-- Insert sample departments
INSERT INTO departments (name, budget) VALUES 
('Mathematics', 50000.00),
('Science', 75000.00),
('English', 40000.00),
('History', 35000.00),
('Physical Education', 30000.00)
ON CONFLICT (name) DO NOTHING;

-- Insert sample users (password is 'password123' hashed with bcrypt)
-- Hash: $2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi
INSERT INTO users (email, password_hash, role, department_id) VALUES 
('admin@school.edu', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'ADMIN', NULL),
('math.head@school.edu', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'DEPARTMENT_HEAD', 1),
('science.head@school.edu', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'DEPARTMENT_HEAD', 2),
('english.head@school.edu', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'DEPARTMENT_HEAD', 3)
ON CONFLICT (email) DO NOTHING;

-- Insert sample courses
INSERT INTO courses (name, department_id, expected_students, instructor_cost, classroom_cost) VALUES 
('Algebra I', 1, 25, 5000.00, 1500.00),
('Geometry', 1, 20, 5000.00, 1500.00),
('Biology', 2, 30, 6000.00, 2500.00),
('Chemistry', 2, 22, 6500.00, 3000.00),
('English Literature', 3, 28, 4500.00, 1000.00),
('World History', 4, 25, 4000.00, 1200.00)
ON CONFLICT DO NOTHING;

-- Enhanced tables for advanced features

-- Instructor availability table
CREATE TABLE IF NOT EXISTS instructor_availability (
    id SERIAL PRIMARY KEY,
    instructor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday, 6=Saturday
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    semester VARCHAR(20) NOT NULL,
    academic_year INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(instructor_id, day_of_week, start_time, end_time, semester, academic_year)
);

-- Equipment table
CREATE TABLE IF NOT EXISTS equipment (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    department_id INTEGER NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    purchase_cost DECIMAL(12, 2) NOT NULL,
    purchase_date DATE NOT NULL,
    depreciation_rate DECIMAL(5, 4) DEFAULT 0.1000, -- 10% per year default
    current_value DECIMAL(12, 2),
    maintenance_cost_annual DECIMAL(10, 2) DEFAULT 0.00,
    status VARCHAR(50) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'MAINTENANCE', 'RETIRED')),
    location VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Facilities/Rooms table
CREATE TABLE IF NOT EXISTS facilities (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100) NOT NULL, -- CLASSROOM, LAB, AUDITORIUM, GYM, etc.
    capacity INTEGER NOT NULL,
    hourly_cost DECIMAL(8, 2) DEFAULT 0.00,
    maintenance_cost_annual DECIMAL(10, 2) DEFAULT 0.00,
    utilities_cost_annual DECIMAL(10, 2) DEFAULT 0.00,
    department_id INTEGER REFERENCES departments(id),
    equipment_ids INTEGER[], -- Array of equipment IDs in this room
    status VARCHAR(50) DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'MAINTENANCE', 'UNAVAILABLE')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Course schedules table
CREATE TABLE IF NOT EXISTS course_schedules (
    id SERIAL PRIMARY KEY,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    instructor_id INTEGER REFERENCES users(id),
    facility_id INTEGER REFERENCES facilities(id),
    semester VARCHAR(20) NOT NULL,
    academic_year INTEGER NOT NULL,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    enrollment_actual INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED', 'ACTIVE', 'COMPLETED', 'CANCELLED')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Utilization metrics table
CREATE TABLE IF NOT EXISTS utilization_metrics (
    id SERIAL PRIMARY KEY,
    department_id INTEGER NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    metric_type VARCHAR(100) NOT NULL, -- INSTRUCTOR_UTILIZATION, FACILITY_UTILIZATION, EQUIPMENT_UTILIZATION, etc.
    metric_date DATE NOT NULL,
    value DECIMAL(10, 4) NOT NULL,
    metadata JSONB, -- Additional metric data
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Budget forecasts table
CREATE TABLE IF NOT EXISTS budget_forecasts (
    id SERIAL PRIMARY KEY,
    department_id INTEGER NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    scenario_name VARCHAR(255) NOT NULL,
    forecast_type VARCHAR(100) NOT NULL, -- OPTIMISTIC, REALISTIC, PESSIMISTIC, CUSTOM
    academic_year INTEGER NOT NULL,
    semester VARCHAR(20),
    projected_revenue DECIMAL(12, 2) DEFAULT 0.00,
    projected_expenses DECIMAL(12, 2) DEFAULT 0.00,
    projected_enrollment INTEGER DEFAULT 0,
    assumptions TEXT,
    confidence_level DECIMAL(5, 2) DEFAULT 0.00, -- Percentage
    created_by INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Cost structures table
CREATE TABLE IF NOT EXISTS cost_structures (
    id SERIAL PRIMARY KEY,
    department_id INTEGER NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    cost_type VARCHAR(100) NOT NULL, -- INSTRUCTOR_DIFFERENTIAL, FACILITY_OVERHEAD, EQUIPMENT_DEPRECIATION, etc.
    cost_category VARCHAR(100) NOT NULL, -- FIXED, VARIABLE, SEMI_VARIABLE
    base_amount DECIMAL(12, 2) NOT NULL,
    per_unit_amount DECIMAL(10, 2) DEFAULT 0.00,
    unit_type VARCHAR(50), -- STUDENT, HOUR, CREDIT_HOUR, etc.
    effective_date DATE NOT NULL,
    expiration_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Academic calendar table
CREATE TABLE IF NOT EXISTS academic_calendar (
    id SERIAL PRIMARY KEY,
    academic_year INTEGER NOT NULL,
    semester VARCHAR(20) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    enrollment_deadline DATE,
    add_drop_deadline DATE,
    final_exams_start DATE,
    final_exams_end DATE,
    status VARCHAR(50) DEFAULT 'PLANNED' CHECK (status IN ('PLANNED', 'ACTIVE', 'COMPLETED')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Equipment reservations table
CREATE TABLE IF NOT EXISTS equipment_reservations (
    id SERIAL PRIMARY KEY,
    equipment_id INTEGER NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
    reserved_by INTEGER NOT NULL REFERENCES users(id),
    course_schedule_id INTEGER REFERENCES course_schedules(id),
    reservation_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    purpose VARCHAR(500),
    status VARCHAR(50) DEFAULT 'RESERVED' CHECK (status IN ('RESERVED', 'ACTIVE', 'COMPLETED', 'CANCELLED')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Budget variance tracking table
CREATE TABLE IF NOT EXISTS budget_variances (
    id SERIAL PRIMARY KEY,
    department_id INTEGER NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    budget_category VARCHAR(100) NOT NULL,
    budgeted_amount DECIMAL(12, 2) NOT NULL,
    actual_amount DECIMAL(12, 2) NOT NULL,
    variance_amount DECIMAL(12, 2) GENERATED ALWAYS AS (actual_amount - budgeted_amount) STORED,
    variance_percentage DECIMAL(8, 4) GENERATED ALWAYS AS (
        CASE WHEN budgeted_amount != 0 
        THEN ((actual_amount - budgeted_amount) / budgeted_amount) * 100 
        ELSE 0 END
    ) STORED,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    explanation TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create additional indexes for performance
CREATE INDEX IF NOT EXISTS idx_instructor_availability_instructor ON instructor_availability(instructor_id);
CREATE INDEX IF NOT EXISTS idx_instructor_availability_day_time ON instructor_availability(day_of_week, start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_equipment_department ON equipment(department_id);
CREATE INDEX IF NOT EXISTS idx_equipment_status ON equipment(status);
CREATE INDEX IF NOT EXISTS idx_facilities_type ON facilities(type);
CREATE INDEX IF NOT EXISTS idx_facilities_department ON facilities(department_id);
CREATE INDEX IF NOT EXISTS idx_course_schedules_course ON course_schedules(course_id);
CREATE INDEX IF NOT EXISTS idx_course_schedules_instructor ON course_schedules(instructor_id);
CREATE INDEX IF NOT EXISTS idx_course_schedules_facility ON course_schedules(facility_id);
CREATE INDEX IF NOT EXISTS idx_course_schedules_time ON course_schedules(day_of_week, start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_utilization_metrics_dept_date ON utilization_metrics(department_id, metric_date);
CREATE INDEX IF NOT EXISTS idx_budget_forecasts_dept_year ON budget_forecasts(department_id, academic_year);
CREATE INDEX IF NOT EXISTS idx_cost_structures_dept_type ON cost_structures(department_id, cost_type);
CREATE INDEX IF NOT EXISTS idx_academic_calendar_year_semester ON academic_calendar(academic_year, semester);
CREATE INDEX IF NOT EXISTS idx_equipment_reservations_equipment ON equipment_reservations(equipment_id);
CREATE INDEX IF NOT EXISTS idx_equipment_reservations_date ON equipment_reservations(reservation_date);
CREATE INDEX IF NOT EXISTS idx_budget_variances_dept_period ON budget_variances(department_id, period_start, period_end);
