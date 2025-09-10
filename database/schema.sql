-- School Budget Management Database Schema

-- Create database (run this separately)
-- CREATE DATABASE school_budget;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('ADMIN', 'DEPARTMENT_HEAD')),
    department_id INTEGER,
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
