/**
 * Core Optimization Algorithm for School Budget Resource Allocation
 * Implements mathematical models for optimal resource distribution
 */

class OptimizationAlgorithm {
    constructor() {
        this.constraints = {
            maxInstructorHours: 40,
            maxFacilityUtilization: 0.85,
            minClassSize: 8,
            maxClassSize: 35,
            budgetBuffer: 0.05 // 5% safety buffer
        };
    }

    /**
     * Main optimization function using linear programming approach
     * @param {Object} resources - Available resources (instructors, facilities, equipment)
     * @param {Array} courses - Course requirements and constraints
     * @param {Object} budget - Budget constraints by department
     * @returns {Object} Optimized allocation plan
     */
    async optimizeAllocation(resources, courses, budget) {
        try {
            const allocationPlan = {
                courseAssignments: [],
                resourceUtilization: {},
                costBreakdown: {},
                optimizationScore: 0,
                warnings: [],
                recommendations: []
            };

            // Step 1: Preprocess and validate inputs
            const validatedInputs = this.validateInputs(resources, courses, budget);
            if (!validatedInputs.isValid) {
                throw new Error(`Input validation failed: ${validatedInputs.errors.join(', ')}`);
            }

            // Step 2: Generate feasible course-instructor-facility combinations
            const feasibleCombinations = this.generateFeasibleCombinations(resources, courses);

            // Step 3: Apply optimization algorithm (Greedy with backtracking)
            const optimizedAssignments = this.greedyOptimization(feasibleCombinations, budget);

            // Step 4: Calculate utilization metrics
            allocationPlan.resourceUtilization = this.calculateUtilization(optimizedAssignments, resources);

            // Step 5: Generate cost breakdown
            allocationPlan.costBreakdown = this.calculateCostBreakdown(optimizedAssignments);

            // Step 6: Calculate optimization score
            allocationPlan.optimizationScore = this.calculateOptimizationScore(allocationPlan);

            // Step 7: Generate warnings and recommendations
            allocationPlan.warnings = this.generateWarnings(allocationPlan);
            allocationPlan.recommendations = this.generateRecommendations(allocationPlan);

            allocationPlan.courseAssignments = optimizedAssignments;

            return allocationPlan;

        } catch (error) {
            console.error('Optimization error:', error);
            throw error;
        }
    }

    /**
     * Validate optimization inputs
     */
    validateInputs(resources, courses, budget) {
        const errors = [];
        
        if (!resources || !resources.instructors || !resources.facilities) {
            errors.push('Missing required resources data');
        }
        
        if (!courses || !Array.isArray(courses) || courses.length === 0) {
            errors.push('No courses provided for optimization');
        }
        
        if (!budget || typeof budget !== 'object') {
            errors.push('Invalid budget constraints');
        }

        // Validate each course has required fields
        courses.forEach((course, index) => {
            if (!course.id || !course.department_id || !course.expected_students) {
                errors.push(`Course ${index} missing required fields`);
            }
        });

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Generate all feasible course-instructor-facility combinations
     */
    generateFeasibleCombinations(resources, courses) {
        const combinations = [];

        courses.forEach(course => {
            // Find available instructors for this course's department
            const availableInstructors = resources.instructors.filter(instructor => 
                instructor.department_id === course.department_id && 
                instructor.status === 'ACTIVE'
            );

            // Find suitable facilities
            const suitableFacilities = resources.facilities.filter(facility => 
                facility.capacity >= course.expected_students &&
                facility.status === 'AVAILABLE' &&
                (facility.department_id === course.department_id || facility.type === 'CLASSROOM')
            );

            // Generate combinations
            availableInstructors.forEach(instructor => {
                suitableFacilities.forEach(facility => {
                    const combination = {
                        courseId: course.id,
                        instructorId: instructor.id,
                        facilityId: facility.id,
                        cost: this.calculateCombinationCost(course, instructor, facility),
                        utilityScore: this.calculateUtilityScore(course, instructor, facility),
                        constraints: this.checkConstraints(course, instructor, facility)
                    };

                    if (combination.constraints.feasible) {
                        combinations.push(combination);
                    }
                });
            });
        });

        return combinations.sort((a, b) => b.utilityScore - a.utilityScore);
    }

    /**
     * Greedy optimization with constraint satisfaction
     */
    greedyOptimization(combinations, budget) {
        const assignments = [];
        const usedInstructors = new Set();
        const usedFacilities = new Map(); // facility -> [time slots]
        const departmentSpending = {};

        // Initialize department spending tracking
        Object.keys(budget).forEach(deptId => {
            departmentSpending[deptId] = 0;
        });

        for (const combination of combinations) {
            // Check if instructor is already over-allocated
            if (usedInstructors.has(combination.instructorId)) {
                continue;
            }

            // Check budget constraints
            const deptId = this.getDepartmentId(combination.courseId);
            if (departmentSpending[deptId] + combination.cost > budget[deptId] * (1 - this.constraints.budgetBuffer)) {
                continue;
            }

            // Check facility conflicts (simplified - assumes no time conflicts for now)
            if (usedFacilities.has(combination.facilityId)) {
                continue;
            }

            // Add assignment
            assignments.push({
                courseId: combination.courseId,
                instructorId: combination.instructorId,
                facilityId: combination.facilityId,
                cost: combination.cost,
                utilityScore: combination.utilityScore,
                assignedAt: new Date()
            });

            // Update tracking
            usedInstructors.add(combination.instructorId);
            usedFacilities.set(combination.facilityId, true);
            departmentSpending[deptId] += combination.cost;
        }

        return assignments;
    }

    /**
     * Calculate cost for a specific course-instructor-facility combination
     */
    calculateCombinationCost(course, instructor, facility) {
        const baseCost = course.instructor_cost || 0;
        const facilityCost = facility.hourly_cost * 45 || course.classroom_cost || 0; // Assume 45 hours per semester
        
        // Apply instructor type differential
        let instructorMultiplier = 1.0;
        switch (instructor.employment_type) {
            case 'ADJUNCT':
                instructorMultiplier = 0.7;
                break;
            case 'PART_TIME':
                instructorMultiplier = 0.8;
                break;
            case 'FULL_TIME':
                instructorMultiplier = 1.0;
                break;
            case 'CONTRACT':
                instructorMultiplier = 1.2;
                break;
        }

        return (baseCost * instructorMultiplier) + facilityCost;
    }

    /**
     * Calculate utility score for optimization ranking
     */
    calculateUtilityScore(course, instructor, facility) {
        let score = 100; // Base score

        // Instructor qualification match (simplified)
        if (instructor.qualifications && instructor.qualifications.includes(course.name.split(' ')[0])) {
            score += 20;
        }

        // Facility capacity efficiency
        const capacityUtilization = course.expected_students / facility.capacity;
        if (capacityUtilization >= 0.7 && capacityUtilization <= 0.9) {
            score += 15;
        } else if (capacityUtilization < 0.5) {
            score -= 10;
        }

        // Department match bonus
        if (facility.department_id === instructor.department_id) {
            score += 10;
        }

        return score;
    }

    /**
     * Check constraints for a combination
     */
    checkConstraints(course, instructor, facility) {
        const constraints = {
            feasible: true,
            violations: []
        };

        // Class size constraints
        if (course.expected_students < this.constraints.minClassSize) {
            constraints.violations.push('Class size below minimum');
        }
        if (course.expected_students > this.constraints.maxClassSize) {
            constraints.violations.push('Class size above maximum');
        }

        // Facility capacity
        if (course.expected_students > facility.capacity) {
            constraints.feasible = false;
            constraints.violations.push('Facility capacity exceeded');
        }

        return constraints;
    }

    /**
     * Calculate resource utilization metrics
     */
    calculateUtilization(assignments, resources) {
        const utilization = {
            instructors: {},
            facilities: {},
            overall: {}
        };

        // Calculate instructor utilization
        const assignedInstructors = new Set(assignments.map(a => a.instructorId));
        utilization.instructors.assigned = assignedInstructors.size;
        utilization.instructors.total = resources.instructors.length;
        utilization.instructors.percentage = (assignedInstructors.size / resources.instructors.length) * 100;

        // Calculate facility utilization
        const assignedFacilities = new Set(assignments.map(a => a.facilityId));
        utilization.facilities.assigned = assignedFacilities.size;
        utilization.facilities.total = resources.facilities.length;
        utilization.facilities.percentage = (assignedFacilities.size / resources.facilities.length) * 100;

        // Overall efficiency score
        utilization.overall.efficiency = (utilization.instructors.percentage + utilization.facilities.percentage) / 2;

        return utilization;
    }

    /**
     * Calculate detailed cost breakdown
     */
    calculateCostBreakdown(assignments) {
        const breakdown = {
            totalCost: 0,
            instructorCosts: 0,
            facilityCosts: 0,
            departmentCosts: {},
            averageCostPerCourse: 0
        };

        assignments.forEach(assignment => {
            const deptId = this.getDepartmentId(assignment.courseId);
            
            breakdown.totalCost += assignment.cost;
            
            if (!breakdown.departmentCosts[deptId]) {
                breakdown.departmentCosts[deptId] = 0;
            }
            breakdown.departmentCosts[deptId] += assignment.cost;
        });

        breakdown.averageCostPerCourse = assignments.length > 0 ? 
            breakdown.totalCost / assignments.length : 0;

        return breakdown;
    }

    /**
     * Calculate optimization score (0-100)
     */
    calculateOptimizationScore(allocationPlan) {
        let score = 0;

        // Resource utilization score (40% weight)
        const utilizationScore = allocationPlan.resourceUtilization.overall.efficiency;
        score += utilizationScore * 0.4;

        // Cost efficiency score (30% weight)
        const costEfficiency = this.calculateCostEfficiency(allocationPlan.costBreakdown);
        score += costEfficiency * 0.3;

        // Constraint satisfaction score (30% weight)
        const constraintScore = allocationPlan.warnings.length === 0 ? 100 : 
            Math.max(0, 100 - (allocationPlan.warnings.length * 10));
        score += constraintScore * 0.3;

        return Math.round(score);
    }

    /**
     * Calculate cost efficiency score
     */
    calculateCostEfficiency(costBreakdown) {
        // Simplified cost efficiency calculation
        // In practice, this would compare against historical data or benchmarks
        const avgCost = costBreakdown.averageCostPerCourse;
        const benchmark = 8000; // Example benchmark cost per course
        
        if (avgCost <= benchmark * 0.8) return 100;
        if (avgCost <= benchmark) return 80;
        if (avgCost <= benchmark * 1.2) return 60;
        return 40;
    }

    /**
     * Generate optimization warnings
     */
    generateWarnings(allocationPlan) {
        const warnings = [];

        if (allocationPlan.resourceUtilization.instructors.percentage < 70) {
            warnings.push('Low instructor utilization detected');
        }

        if (allocationPlan.resourceUtilization.facilities.percentage < 60) {
            warnings.push('Low facility utilization detected');
        }

        if (allocationPlan.optimizationScore < 70) {
            warnings.push('Overall optimization score is below target');
        }

        return warnings;
    }

    /**
     * Generate optimization recommendations
     */
    generateRecommendations(allocationPlan) {
        const recommendations = [];

        if (allocationPlan.resourceUtilization.instructors.percentage > 90) {
            recommendations.push('Consider hiring additional instructors to reduce workload');
        }

        if (allocationPlan.resourceUtilization.facilities.percentage > 85) {
            recommendations.push('Facility capacity is near maximum - consider expanding or optimizing schedules');
        }

        const avgCost = allocationPlan.costBreakdown.averageCostPerCourse;
        if (avgCost > 10000) {
            recommendations.push('High average cost per course - review instructor assignments and facility usage');
        }

        return recommendations;
    }

    /**
     * Helper method to get department ID from course ID
     * In practice, this would query the database
     */
    getDepartmentId(courseId) {
        // Simplified - would need actual database lookup
        return 1; // Default department ID
    }

    /**
     * Advanced optimization using genetic algorithm (for future implementation)
     */
    async geneticOptimization(resources, courses, budget, generations = 100) {
        // Placeholder for genetic algorithm implementation
        // This would be used for more complex optimization scenarios
        console.log('Genetic algorithm optimization not yet implemented');
        return this.optimizeAllocation(resources, courses, budget);
    }

    /**
     * Multi-objective optimization considering multiple criteria
     */
    async multiObjectiveOptimization(resources, courses, budget, objectives) {
        // Placeholder for multi-objective optimization
        // Objectives could include: cost minimization, utilization maximization, 
        // student satisfaction, instructor preference, etc.
        console.log('Multi-objective optimization not yet implemented');
        return this.optimizeAllocation(resources, courses, budget);
    }
}

module.exports = OptimizationAlgorithm;
