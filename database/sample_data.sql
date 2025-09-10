-- Sample Data for Enhanced School Budget Management System
-- This script populates the database with realistic sample data for testing

-- Insert sample facilities
INSERT INTO facilities (name, type, capacity, hourly_cost, maintenance_cost_annual, utilities_cost_annual, department_id, status) VALUES 
('Math Lab A', 'LAB', 30, 35.00, 3000.00, 4500.00, 1, 'AVAILABLE'),
('Science Lab B', 'LAB', 25, 45.00, 5000.00, 6000.00, 2, 'AVAILABLE'),
('Lecture Hall 101', 'AUDITORIUM', 150, 75.00, 8000.00, 12000.00, NULL, 'AVAILABLE'),
('Classroom 201', 'CLASSROOM', 35, 25.00, 2000.00, 3000.00, 3, 'AVAILABLE'),
('Computer Lab C', 'LAB', 40, 50.00, 4000.00, 5500.00, 1, 'AVAILABLE'),
('Gymnasium', 'GYM', 200, 60.00, 10000.00, 8000.00, 5, 'AVAILABLE'),
('Library Study Room', 'CLASSROOM', 20, 15.00, 1500.00, 2000.00, NULL, 'AVAILABLE'),
('Chemistry Lab', 'LAB', 28, 55.00, 6000.00, 7000.00, 2, 'AVAILABLE')
ON CONFLICT DO NOTHING;

-- Insert sample equipment
INSERT INTO equipment (name, description, department_id, purchase_cost, purchase_date, depreciation_rate, current_value, maintenance_cost_annual, status, location) VALUES 
('Graphing Calculators (Set of 30)', 'TI-84 Plus CE Graphing Calculators', 1, 3600.00, '2022-08-15', 0.15, 2700.00, 200.00, 'ACTIVE', 'Math Lab A'),
('Microscopes (Set of 15)', 'Compound Light Microscopes', 2, 7500.00, '2021-06-10', 0.10, 6375.00, 500.00, 'ACTIVE', 'Science Lab B'),
('Projector System', 'Smart Board Interactive Projector', 3, 2800.00, '2023-01-20', 0.20, 2352.00, 300.00, 'ACTIVE', 'Classroom 201'),
('Desktop Computers (Set of 20)', 'Dell OptiPlex 7090', 1, 24000.00, '2022-09-01', 0.25, 18000.00, 1200.00, 'ACTIVE', 'Computer Lab C'),
('Chemistry Fume Hood', 'Laboratory Fume Hood with Safety Features', 2, 8500.00, '2020-03-15', 0.08, 7310.00, 800.00, 'ACTIVE', 'Chemistry Lab'),
('Gym Equipment Set', 'Basketball Hoops, Volleyball Nets, Exercise Mats', 5, 5200.00, '2021-07-20', 0.12, 4368.00, 600.00, 'ACTIVE', 'Gymnasium'),
('3D Printer', 'Ultimaker S3 3D Printer', 1, 4200.00, '2023-02-10', 0.30, 3570.00, 400.00, 'ACTIVE', 'Math Lab A'),
('Spectrophotometer', 'UV-Vis Spectrophotometer', 2, 12000.00, '2019-11-05', 0.10, 9600.00, 1000.00, 'ACTIVE', 'Chemistry Lab')
ON CONFLICT DO NOTHING;

-- Insert enhanced user data with new fields
UPDATE users SET 
    first_name = 'John',
    last_name = 'Admin',
    phone = '555-0101',
    office_location = 'Administration Building 100',
    qualifications = 'MBA Education Administration, 15 years experience',
    hire_date = '2015-08-01',
    employment_type = 'FULL_TIME'
WHERE email = 'admin@school.edu';

UPDATE users SET 
    first_name = 'Sarah',
    last_name = 'Johnson',
    phone = '555-0201',
    office_location = 'Math Building 205',
    qualifications = 'PhD Mathematics, Masters in Education, 12 years teaching experience',
    hire_date = '2018-08-15',
    employment_type = 'FULL_TIME',
    hourly_rate = 75.00
WHERE email = 'math.head@school.edu';

UPDATE users SET 
    first_name = 'Michael',
    last_name = 'Chen',
    phone = '555-0301',
    office_location = 'Science Building 301',
    qualifications = 'PhD Chemistry, 10 years research and teaching experience',
    hire_date = '2019-01-10',
    employment_type = 'FULL_TIME',
    hourly_rate = 80.00
WHERE email = 'science.head@school.edu';

UPDATE users SET 
    first_name = 'Emily',
    last_name = 'Rodriguez',
    phone = '555-0401',
    office_location = 'Humanities Building 150',
    qualifications = 'MA English Literature, 8 years teaching experience',
    hire_date = '2020-08-20',
    employment_type = 'FULL_TIME',
    hourly_rate = 65.00
WHERE email = 'english.head@school.edu';

-- Insert additional teachers
INSERT INTO users (email, password_hash, role, department_id, first_name, last_name, phone, office_location, qualifications, hire_date, employment_type, hourly_rate) VALUES 
('alice.smith@school.edu', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'TEACHER', 1, 'Alice', 'Smith', '555-1001', 'Math Building 210', 'MS Mathematics, 6 years experience', '2021-08-15', 'FULL_TIME', 68.00),
('bob.wilson@school.edu', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'TEACHER', 2, 'Bob', 'Wilson', '555-1002', 'Science Building 205', 'PhD Biology, 15 years experience', '2017-01-10', 'FULL_TIME', 78.00),
('carol.davis@school.edu', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'TEACHER', 3, 'Carol', 'Davis', '555-1003', 'Humanities Building 120', 'MA English, 4 years experience', '2022-08-20', 'PART_TIME', 55.00),
('frank.miller@school.edu', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'TEACHER', 2, 'Frank', 'Miller', '555-1004', 'Science Building 208', 'PhD Chemistry, 8 years experience', '2019-09-01', 'FULL_TIME', 72.00),
('david.brown@school.edu', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'TEACHER', 4, 'David', 'Brown', '555-1005', 'Social Studies Building 115', 'MA History, 10 years experience', '2018-01-15', 'FULL_TIME', 65.00),
('user@school.edu', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'USER', NULL, 'Regular', 'User', '555-2001', NULL, 'Student/Staff member', '2024-01-15', 'PART_TIME', NULL),
('frank.lee@school.edu', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'TEACHER', 2, 'Frank', 'Lee', '555-1006', 'Science Building 220', 'MS Physics, 3 years experience', '2023-08-10', 'ADJUNCT', 45.00)
ON CONFLICT (email) DO NOTHING;

-- Insert instructor availability
INSERT INTO instructor_availability (instructor_id, day_of_week, start_time, end_time, semester, academic_year) VALUES 
-- Sarah Johnson (Math Head) - Available Monday-Friday 8AM-4PM
(2, 1, '08:00', '16:00', 'Fall', 2024),
(2, 2, '08:00', '16:00', 'Fall', 2024),
(2, 3, '08:00', '16:00', 'Fall', 2024),
(2, 4, '08:00', '16:00', 'Fall', 2024),
(2, 5, '08:00', '16:00', 'Fall', 2024),
-- Michael Chen (Science Head) - Available Monday-Friday 9AM-5PM
(3, 1, '09:00', '17:00', 'Fall', 2024),
(3, 2, '09:00', '17:00', 'Fall', 2024),
(3, 3, '09:00', '17:00', 'Fall', 2024),
(3, 4, '09:00', '17:00', 'Fall', 2024),
(3, 5, '09:00', '17:00', 'Fall', 2024),
-- Alice Smith - Available Monday, Wednesday, Friday
(5, 1, '08:00', '15:00', 'Fall', 2024),
(5, 3, '08:00', '15:00', 'Fall', 2024),
(5, 5, '08:00', '15:00', 'Fall', 2024),
-- Bob Wilson - Available Tuesday, Thursday
(6, 2, '10:00', '18:00', 'Fall', 2024),
(6, 4, '10:00', '18:00', 'Fall', 2024)
ON CONFLICT DO NOTHING;

-- Insert course schedules
INSERT INTO course_schedules (course_id, instructor_id, facility_id, semester, academic_year, day_of_week, start_time, end_time, enrollment_actual, status) VALUES 
(1, 2, 1, 'Fall', 2024, 1, '09:00', '10:00', 28, 'ACTIVE'), -- Algebra I with Sarah in Math Lab A
(2, 5, 4, 'Fall', 2024, 3, '10:00', '11:00', 22, 'ACTIVE'), -- Geometry with Alice in Classroom 201
(3, 3, 2, 'Fall', 2024, 2, '11:00', '12:00', 32, 'ACTIVE'), -- Biology with Michael in Science Lab B
(4, 6, 8, 'Fall', 2024, 4, '14:00', '15:00', 25, 'ACTIVE'), -- Chemistry with Frank in Chemistry Lab
(5, 4, 4, 'Fall', 2024, 1, '13:00', '14:00', 30, 'ACTIVE'), -- English Literature with Emily in Classroom 201
(6, 7, 4, 'Fall', 2024, 5, '15:00', '16:00', 27, 'ACTIVE')  -- World History with David in Classroom 201
ON CONFLICT DO NOTHING;

-- Insert academic calendar
INSERT INTO academic_calendar (academic_year, semester, start_date, end_date, enrollment_deadline, add_drop_deadline, final_exams_start, final_exams_end, status) VALUES 
(2024, 'Fall', '2024-08-26', '2024-12-15', '2024-08-20', '2024-09-10', '2024-12-09', '2024-12-15', 'ACTIVE'),
(2024, 'Spring', '2025-01-15', '2025-05-10', '2025-01-10', '2025-01-30', '2025-05-05', '2025-05-10', 'PLANNED'),
(2025, 'Fall', '2025-08-25', '2025-12-14', '2025-08-19', '2025-09-09', '2025-12-08', '2025-12-14', 'PLANNED')
ON CONFLICT DO NOTHING;

-- Insert equipment reservations
INSERT INTO equipment_reservations (equipment_id, reserved_by, reservation_date, start_time, end_time, purpose, status) VALUES 
(1, 2, '2024-09-15', '09:00', '10:00', 'Algebra I class - graphing functions', 'COMPLETED'),
(2, 3, '2024-09-16', '11:00', '12:00', 'Biology lab - cell observation', 'COMPLETED'),
(4, 5, '2024-09-17', '10:00', '11:00', 'Computer programming lesson', 'RESERVED'),
(7, 2, '2024-09-18', '14:00', '15:00', '3D modeling demonstration', 'RESERVED'),
(8, 6, '2024-09-19', '14:00', '15:00', 'Chemical analysis lab', 'RESERVED')
ON CONFLICT DO NOTHING;

-- Insert cost structures
INSERT INTO cost_structures (department_id, cost_type, cost_category, base_amount, per_unit_amount, unit_type, effective_date) VALUES 
(1, 'INSTRUCTOR_DIFFERENTIAL', 'VARIABLE', 0.00, 15.00, 'CREDIT_HOUR', '2024-01-01'),
(2, 'INSTRUCTOR_DIFFERENTIAL', 'VARIABLE', 0.00, 18.00, 'CREDIT_HOUR', '2024-01-01'),
(3, 'INSTRUCTOR_DIFFERENTIAL', 'VARIABLE', 0.00, 12.00, 'CREDIT_HOUR', '2024-01-01'),
(4, 'INSTRUCTOR_DIFFERENTIAL', 'VARIABLE', 0.00, 12.00, 'CREDIT_HOUR', '2024-01-01'),
(5, 'INSTRUCTOR_DIFFERENTIAL', 'VARIABLE', 0.00, 10.00, 'CREDIT_HOUR', '2024-01-01'),
(1, 'FACILITY_OVERHEAD', 'FIXED', 2500.00, 0.00, NULL, '2024-01-01'),
(2, 'FACILITY_OVERHEAD', 'FIXED', 3500.00, 0.00, NULL, '2024-01-01'),
(3, 'FACILITY_OVERHEAD', 'FIXED', 2000.00, 0.00, NULL, '2024-01-01'),
(4, 'FACILITY_OVERHEAD', 'FIXED', 1800.00, 0.00, NULL, '2024-01-01'),
(5, 'FACILITY_OVERHEAD', 'FIXED', 2200.00, 0.00, NULL, '2024-01-01')
ON CONFLICT DO NOTHING;

-- Insert utilization metrics
INSERT INTO utilization_metrics (department_id, metric_type, metric_date, value, metadata) VALUES 
(1, 'INSTRUCTOR_UTILIZATION', '2024-09-01', 0.75, '{"courses_assigned": 3, "max_capacity": 4}'),
(1, 'FACILITY_UTILIZATION', '2024-09-01', 0.68, '{"hours_used": 34, "hours_available": 50}'),
(1, 'EQUIPMENT_UTILIZATION', '2024-09-01', 0.45, '{"reservations": 18, "max_reservations": 40}'),
(2, 'INSTRUCTOR_UTILIZATION', '2024-09-01', 0.82, '{"courses_assigned": 4, "max_capacity": 5}'),
(2, 'FACILITY_UTILIZATION', '2024-09-01', 0.72, '{"hours_used": 36, "hours_available": 50}'),
(2, 'EQUIPMENT_UTILIZATION', '2024-09-01', 0.65, '{"reservations": 26, "max_reservations": 40}'),
(3, 'INSTRUCTOR_UTILIZATION', '2024-09-01', 0.60, '{"courses_assigned": 2, "max_capacity": 3}'),
(3, 'FACILITY_UTILIZATION', '2024-09-01', 0.55, '{"hours_used": 27, "hours_available": 50}'),
(4, 'INSTRUCTOR_UTILIZATION', '2024-09-01', 0.70, '{"courses_assigned": 2, "max_capacity": 3}'),
(5, 'INSTRUCTOR_UTILIZATION', '2024-09-01', 0.50, '{"courses_assigned": 1, "max_capacity": 2}')
ON CONFLICT DO NOTHING;

-- Insert budget forecasts
INSERT INTO budget_forecasts (department_id, scenario_name, forecast_type, academic_year, semester, projected_revenue, projected_expenses, projected_enrollment, assumptions, confidence_level, created_by) VALUES 
(1, 'Math Department - Optimistic 2025', 'OPTIMISTIC', 2025, 'Fall', 180000.00, 145000.00, 450, 'Increased enrollment due to new STEM programs, efficient resource utilization', 85.0, 2),
(1, 'Math Department - Realistic 2025', 'REALISTIC', 2025, 'Fall', 165000.00, 155000.00, 420, 'Steady enrollment growth, moderate cost increases', 90.0, 2),
(1, 'Math Department - Pessimistic 2025', 'PESSIMISTIC', 2025, 'Fall', 150000.00, 170000.00, 380, 'Declining enrollment, increased operational costs', 75.0, 2),
(2, 'Science Department - Realistic 2025', 'REALISTIC', 2025, 'Fall', 220000.00, 195000.00, 350, 'Lab equipment upgrades, stable enrollment', 88.0, 3),
(3, 'English Department - Realistic 2025', 'REALISTIC', 2025, 'Fall', 140000.00, 125000.00, 380, 'Standard curriculum delivery, moderate growth', 85.0, 4)
ON CONFLICT DO NOTHING;

-- Insert budget variances for historical analysis
INSERT INTO budget_variances (department_id, budget_category, budgeted_amount, actual_amount, period_start, period_end, explanation) VALUES 
(1, 'INSTRUCTOR_COSTS', 45000.00, 47500.00, '2024-01-01', '2024-06-30', 'Higher than expected adjunct instructor costs'),
(1, 'FACILITY_COSTS', 15000.00, 14200.00, '2024-01-01', '2024-06-30', 'Lower utility costs due to energy efficiency measures'),
(1, 'EQUIPMENT_COSTS', 8000.00, 9200.00, '2024-01-01', '2024-06-30', 'Unexpected equipment maintenance and repairs'),
(2, 'INSTRUCTOR_COSTS', 55000.00, 53800.00, '2024-01-01', '2024-06-30', 'Efficient scheduling reduced overtime costs'),
(2, 'FACILITY_COSTS', 22000.00, 24500.00, '2024-01-01', '2024-06-30', 'Increased lab maintenance costs for safety compliance'),
(3, 'INSTRUCTOR_COSTS', 38000.00, 39100.00, '2024-01-01', '2024-06-30', 'Additional professional development costs'),
(4, 'INSTRUCTOR_COSTS', 35000.00, 34200.00, '2024-01-01', '2024-06-30', 'Efficient resource allocation'),
(5, 'EQUIPMENT_COSTS', 12000.00, 13500.00, '2024-01-01', '2024-06-30', 'New gym equipment purchases')
ON CONFLICT DO NOTHING;

-- Update equipment current values based on depreciation
UPDATE equipment SET current_value = purchase_cost * (1 - depreciation_rate * EXTRACT(YEAR FROM AGE(CURRENT_DATE, purchase_date)));

-- Update course costs to reflect more realistic values
UPDATE courses SET 
    instructor_cost = CASE 
        WHEN department_id = 1 THEN 6500.00
        WHEN department_id = 2 THEN 7200.00
        WHEN department_id = 3 THEN 5800.00
        WHEN department_id = 4 THEN 5500.00
        WHEN department_id = 5 THEN 5200.00
        ELSE instructor_cost
    END,
    classroom_cost = CASE 
        WHEN department_id = 2 THEN 2800.00 -- Science labs cost more
        WHEN department_id = 5 THEN 2200.00 -- Gym facilities
        ELSE 1800.00
    END
WHERE id IN (1, 2, 3, 4, 5, 6);

-- Insert sample transfers for testing
INSERT INTO transfers (from_department_id, to_department_id, amount, reason, created_by) VALUES 
(1, 2, 5000.00, 'Transfer for shared lab equipment purchase', 1),
(3, 1, 2500.00, 'Support for math tutoring program', 1),
(2, 5, 3000.00, 'Funding for science fair in gymnasium', 1)
ON CONFLICT DO NOTHING;
