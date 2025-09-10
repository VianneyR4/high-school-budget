/**
 * Smart Resource Allocator for School Budget Management
 * Handles intelligent distribution of instructors, facilities, and equipment
 */

const OptimizationAlgorithm = require('./OptimizationAlgorithm');
const CostCalculator = require('./CostCalculator');

class ResourceAllocator {
    constructor() {
        this.optimizer = new OptimizationAlgorithm();
        this.costCalculator = new CostCalculator();
        
        this.allocationStrategies = {
            COST_MINIMIZATION: 'cost_minimization',
            UTILIZATION_MAXIMIZATION: 'utilization_maximization',
            BALANCED: 'balanced',
            QUALITY_FOCUSED: 'quality_focused'
        };

        this.constraints = {
            maxInstructorLoad: 6, // Maximum courses per instructor
            minFacilityGap: 30, // Minimum minutes between classes in same room
            maxConsecutiveHours: 4, // Maximum consecutive teaching hours
            preferredUtilization: { min: 0.7, max: 0.9 }
        };
    }

    /**
     * Main resource allocation function
     * @param {Object} resources - Available resources
     * @param {Array} courses - Courses to allocate
     * @param {Object} constraints - Additional constraints
     * @param {string} strategy - Allocation strategy
     * @returns {Object} Allocation plan with assignments and metrics
     */
    async allocateResources(resources, courses, constraints = {}, strategy = 'balanced') {
        try {
            // Merge constraints
            const mergedConstraints = { ...this.constraints, ...constraints };

            // Validate inputs
            this.validateAllocationInputs(resources, courses);

            // Preprocess resources and courses
            const preprocessedData = await this.preprocessAllocationData(resources, courses);

            // Generate allocation plan based on strategy
            let allocationPlan;
            switch (strategy) {
                case this.allocationStrategies.COST_MINIMIZATION:
                    allocationPlan = await this.costMinimizationAllocation(preprocessedData, mergedConstraints);
                    break;
                case this.allocationStrategies.UTILIZATION_MAXIMIZATION:
                    allocationPlan = await this.utilizationMaximizationAllocation(preprocessedData, mergedConstraints);
                    break;
                case this.allocationStrategies.QUALITY_FOCUSED:
                    allocationPlan = await this.qualityFocusedAllocation(preprocessedData, mergedConstraints);
                    break;
                case this.allocationStrategies.BALANCED:
                default:
                    allocationPlan = await this.balancedAllocation(preprocessedData, mergedConstraints);
                    break;
            }

            // Post-process and validate allocation
            const finalPlan = await this.postProcessAllocation(allocationPlan, preprocessedData);

            return finalPlan;

        } catch (error) {
            console.error('Resource allocation error:', error);
            throw new Error(`Resource allocation failed: ${error.message}`);
        }
    }

    /**
     * Validate allocation inputs
     */
    validateAllocationInputs(resources, courses) {
        if (!resources || !resources.instructors || !resources.facilities) {
            throw new Error('Invalid resources data structure');
        }

        if (!courses || !Array.isArray(courses) || courses.length === 0) {
            throw new Error('No courses provided for allocation');
        }

        // Check for required fields
        courses.forEach((course, index) => {
            if (!course.id || !course.department_id) {
                throw new Error(`Course ${index} missing required fields (id, department_id)`);
            }
        });

        resources.instructors.forEach((instructor, index) => {
            if (!instructor.id || !instructor.department_id) {
                throw new Error(`Instructor ${index} missing required fields (id, department_id)`);
            }
        });
    }

    /**
     * Preprocess allocation data
     */
    async preprocessAllocationData(resources, courses) {
        const preprocessed = {
            instructors: this.preprocessInstructors(resources.instructors),
            facilities: this.preprocessFacilities(resources.facilities),
            equipment: resources.equipment || [],
            courses: this.preprocessCourses(courses),
            availabilityMatrix: {},
            compatibilityMatrix: {}
        };

        // Build availability matrix
        preprocessed.availabilityMatrix = await this.buildAvailabilityMatrix(
            preprocessed.instructors, 
            preprocessed.facilities
        );

        // Build compatibility matrix
        preprocessed.compatibilityMatrix = this.buildCompatibilityMatrix(
            preprocessed.courses,
            preprocessed.instructors,
            preprocessed.facilities
        );

        return preprocessed;
    }

    /**
     * Preprocess instructors data
     */
    preprocessInstructors(instructors) {
        return instructors.map(instructor => ({
            ...instructor,
            currentLoad: 0,
            assignedCourses: [],
            availableHours: this.calculateInstructorAvailableHours(instructor),
            qualificationScore: this.calculateQualificationScore(instructor),
            costPerHour: this.calculateInstructorCostPerHour(instructor)
        }));
    }

    /**
     * Preprocess facilities data
     */
    preprocessFacilities(facilities) {
        return facilities.map(facility => ({
            ...facility,
            currentUtilization: 0,
            scheduledSlots: [],
            utilizationScore: 0,
            costPerHour: facility.hourly_cost || 0
        }));
    }

    /**
     * Preprocess courses data
     */
    preprocessCourses(courses) {
        return courses.map(course => ({
            ...course,
            priority: this.calculateCoursePriority(course),
            complexity: this.calculateCourseComplexity(course),
            resourceRequirements: this.analyzeResourceRequirements(course)
        }));
    }

    /**
     * Build availability matrix for instructors and facilities
     */
    async buildAvailabilityMatrix(instructors, facilities) {
        const matrix = {
            instructors: {},
            facilities: {}
        };

        // Build instructor availability
        instructors.forEach(instructor => {
            matrix.instructors[instructor.id] = {
                totalHours: 40, // Default 40 hours per week
                availableSlots: this.generateTimeSlots(),
                preferences: instructor.preferences || {},
                restrictions: instructor.restrictions || {}
            };
        });

        // Build facility availability
        facilities.forEach(facility => {
            matrix.facilities[facility.id] = {
                totalHours: 50, // Default 50 hours per week (10 hours/day, 5 days)
                availableSlots: this.generateTimeSlots(),
                maintenanceWindows: facility.maintenance_windows || [],
                restrictions: facility.restrictions || {}
            };
        });

        return matrix;
    }

    /**
     * Build compatibility matrix
     */
    buildCompatibilityMatrix(courses, instructors, facilities) {
        const matrix = {};

        courses.forEach(course => {
            matrix[course.id] = {
                compatibleInstructors: this.findCompatibleInstructors(course, instructors),
                compatibleFacilities: this.findCompatibleFacilities(course, facilities),
                requiredEquipment: course.equipment_requirements || []
            };
        });

        return matrix;
    }

    /**
     * Cost minimization allocation strategy
     */
    async costMinimizationAllocation(data, constraints) {
        const allocation = {
            assignments: [],
            totalCost: 0,
            strategy: 'cost_minimization'
        };

        // Sort courses by cost efficiency (lowest cost per student)
        const sortedCourses = data.courses.sort((a, b) => {
            const costA = (a.instructor_cost + a.classroom_cost) / (a.expected_students || 1);
            const costB = (b.instructor_cost + b.classroom_cost) / (b.expected_students || 1);
            return costA - costB;
        });

        for (const course of sortedCourses) {
            const assignment = await this.findCostOptimalAssignment(course, data, constraints);
            if (assignment) {
                allocation.assignments.push(assignment);
                allocation.totalCost += assignment.cost;
                this.updateResourceAvailability(assignment, data);
            }
        }

        return allocation;
    }

    /**
     * Utilization maximization allocation strategy
     */
    async utilizationMaximizationAllocation(data, constraints) {
        const allocation = {
            assignments: [],
            totalUtilization: 0,
            strategy: 'utilization_maximization'
        };

        // Sort courses by resource utilization potential
        const sortedCourses = data.courses.sort((a, b) => {
            return (b.expected_students || 0) - (a.expected_students || 0);
        });

        for (const course of sortedCourses) {
            const assignment = await this.findUtilizationOptimalAssignment(course, data, constraints);
            if (assignment) {
                allocation.assignments.push(assignment);
                this.updateResourceAvailability(assignment, data);
            }
        }

        // Calculate total utilization
        allocation.totalUtilization = this.calculateTotalUtilization(allocation.assignments, data);

        return allocation;
    }

    /**
     * Quality-focused allocation strategy
     */
    async qualityFocusedAllocation(data, constraints) {
        const allocation = {
            assignments: [],
            qualityScore: 0,
            strategy: 'quality_focused'
        };

        // Sort courses by priority and complexity
        const sortedCourses = data.courses.sort((a, b) => {
            return (b.priority * b.complexity) - (a.priority * a.complexity);
        });

        for (const course of sortedCourses) {
            const assignment = await this.findQualityOptimalAssignment(course, data, constraints);
            if (assignment) {
                allocation.assignments.push(assignment);
                this.updateResourceAvailability(assignment, data);
            }
        }

        // Calculate quality score
        allocation.qualityScore = this.calculateQualityScore(allocation.assignments);

        return allocation;
    }

    /**
     * Balanced allocation strategy
     */
    async balancedAllocation(data, constraints) {
        const allocation = {
            assignments: [],
            balanceScore: 0,
            strategy: 'balanced'
        };

        // Sort courses by balanced score (cost + utilization + quality)
        const sortedCourses = data.courses.sort((a, b) => {
            const scoreA = this.calculateBalancedScore(a, data);
            const scoreB = this.calculateBalancedScore(b, data);
            return scoreB - scoreA;
        });

        for (const course of sortedCourses) {
            const assignment = await this.findBalancedOptimalAssignment(course, data, constraints);
            if (assignment) {
                allocation.assignments.push(assignment);
                this.updateResourceAvailability(assignment, data);
            }
        }

        // Calculate balance score
        allocation.balanceScore = this.calculateOverallBalanceScore(allocation.assignments, data);

        return allocation;
    }

    /**
     * Find cost-optimal assignment for a course
     */
    async findCostOptimalAssignment(course, data, constraints) {
        const compatibleInstructors = data.compatibilityMatrix[course.id].compatibleInstructors;
        const compatibleFacilities = data.compatibilityMatrix[course.id].compatibleFacilities;

        let bestAssignment = null;
        let lowestCost = Infinity;

        for (const instructor of compatibleInstructors) {
            for (const facility of compatibleFacilities) {
                if (this.checkAssignmentConstraints(course, instructor, facility, constraints)) {
                    const cost = this.costCalculator.calculateComprehensiveCost(
                        course, instructor, facility, data.equipment
                    );

                    if (cost.totalCost < lowestCost) {
                        lowestCost = cost.totalCost;
                        bestAssignment = {
                            courseId: course.id,
                            instructorId: instructor.id,
                            facilityId: facility.id,
                            cost: cost.totalCost,
                            costBreakdown: cost,
                            timeSlot: this.findOptimalTimeSlot(instructor, facility, course)
                        };
                    }
                }
            }
        }

        return bestAssignment;
    }

    /**
     * Find utilization-optimal assignment for a course
     */
    async findUtilizationOptimalAssignment(course, data, constraints) {
        const compatibleInstructors = data.compatibilityMatrix[course.id].compatibleInstructors;
        const compatibleFacilities = data.compatibilityMatrix[course.id].compatibleFacilities;

        let bestAssignment = null;
        let highestUtilization = 0;

        for (const instructor of compatibleInstructors) {
            for (const facility of compatibleFacilities) {
                if (this.checkAssignmentConstraints(course, instructor, facility, constraints)) {
                    const utilization = this.calculateAssignmentUtilization(course, instructor, facility);

                    if (utilization > highestUtilization) {
                        highestUtilization = utilization;
                        bestAssignment = {
                            courseId: course.id,
                            instructorId: instructor.id,
                            facilityId: facility.id,
                            utilization: utilization,
                            timeSlot: this.findOptimalTimeSlot(instructor, facility, course)
                        };
                    }
                }
            }
        }

        return bestAssignment;
    }

    /**
     * Find quality-optimal assignment for a course
     */
    async findQualityOptimalAssignment(course, data, constraints) {
        const compatibleInstructors = data.compatibilityMatrix[course.id].compatibleInstructors;
        const compatibleFacilities = data.compatibilityMatrix[course.id].compatibleFacilities;

        let bestAssignment = null;
        let highestQuality = 0;

        for (const instructor of compatibleInstructors) {
            for (const facility of compatibleFacilities) {
                if (this.checkAssignmentConstraints(course, instructor, facility, constraints)) {
                    const quality = this.calculateAssignmentQuality(course, instructor, facility);

                    if (quality > highestQuality) {
                        highestQuality = quality;
                        bestAssignment = {
                            courseId: course.id,
                            instructorId: instructor.id,
                            facilityId: facility.id,
                            qualityScore: quality,
                            timeSlot: this.findOptimalTimeSlot(instructor, facility, course)
                        };
                    }
                }
            }
        }

        return bestAssignment;
    }

    /**
     * Find balanced-optimal assignment for a course
     */
    async findBalancedOptimalAssignment(course, data, constraints) {
        const compatibleInstructors = data.compatibilityMatrix[course.id].compatibleInstructors;
        const compatibleFacilities = data.compatibilityMatrix[course.id].compatibleFacilities;

        let bestAssignment = null;
        let highestScore = 0;

        for (const instructor of compatibleInstructors) {
            for (const facility of compatibleFacilities) {
                if (this.checkAssignmentConstraints(course, instructor, facility, constraints)) {
                    const cost = this.costCalculator.calculateComprehensiveCost(
                        course, instructor, facility, data.equipment
                    );
                    const utilization = this.calculateAssignmentUtilization(course, instructor, facility);
                    const quality = this.calculateAssignmentQuality(course, instructor, facility);

                    // Balanced score (weighted combination)
                    const balancedScore = (quality * 0.4) + (utilization * 0.3) + ((1/cost.totalCost) * 10000 * 0.3);

                    if (balancedScore > highestScore) {
                        highestScore = balancedScore;
                        bestAssignment = {
                            courseId: course.id,
                            instructorId: instructor.id,
                            facilityId: facility.id,
                            cost: cost.totalCost,
                            costBreakdown: cost,
                            utilization: utilization,
                            qualityScore: quality,
                            balancedScore: balancedScore,
                            timeSlot: this.findOptimalTimeSlot(instructor, facility, course)
                        };
                    }
                }
            }
        }

        return bestAssignment;
    }

    /**
     * Helper methods
     */
    calculateInstructorAvailableHours(instructor) {
        // Default 40 hours minus current assignments
        return 40 - (instructor.currentLoad || 0);
    }

    calculateQualificationScore(instructor) {
        let score = 50; // Base score
        
        if (instructor.qualifications) {
            if (instructor.qualifications.includes('PhD')) score += 30;
            else if (instructor.qualifications.includes('Masters')) score += 20;
            else if (instructor.qualifications.includes('Bachelors')) score += 10;
        }

        // Add experience bonus
        const yearsExperience = instructor.years_experience || 0;
        score += Math.min(yearsExperience * 2, 20); // Max 20 points for experience

        return score;
    }

    calculateInstructorCostPerHour(instructor) {
        if (instructor.hourly_rate) {
            return instructor.hourly_rate;
        }

        // Estimate based on employment type
        switch (instructor.employment_type) {
            case 'FULL_TIME': return 75;
            case 'PART_TIME': return 60;
            case 'ADJUNCT': return 50;
            case 'CONTRACT': return 90;
            default: return 65;
        }
    }

    calculateCoursePriority(course) {
        let priority = 50; // Base priority
        
        // Higher priority for larger classes
        priority += Math.min((course.expected_students || 0) / 5, 20);
        
        // Higher priority for required courses
        if (course.is_required) priority += 15;
        
        // Higher priority for advanced courses
        if (course.level && course.level > 100) priority += 10;

        return priority;
    }

    calculateCourseComplexity(course) {
        let complexity = 1; // Base complexity
        
        // Lab courses are more complex
        if (course.type === 'LAB') complexity += 0.5;
        
        // Advanced courses are more complex
        if (course.level && course.level > 300) complexity += 0.3;
        
        // Large classes are more complex to manage
        if (course.expected_students > 30) complexity += 0.2;

        return complexity;
    }

    analyzeResourceRequirements(course) {
        return {
            specialEquipment: course.equipment_requirements || [],
            facilityType: course.facility_type || 'CLASSROOM',
            minCapacity: course.expected_students || 20,
            specialRequirements: course.special_requirements || []
        };
    }

    generateTimeSlots() {
        const slots = [];
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
        const hours = [8, 9, 10, 11, 13, 14, 15, 16, 17]; // 8am-6pm, skip 12pm lunch

        days.forEach(day => {
            hours.forEach(hour => {
                slots.push({
                    day: day,
                    startTime: `${hour}:00`,
                    endTime: `${hour + 1}:00`,
                    available: true
                });
            });
        });

        return slots;
    }

    findCompatibleInstructors(course, instructors) {
        return instructors.filter(instructor => {
            // Same department or qualified to teach
            if (instructor.department_id === course.department_id) return true;
            
            // Cross-department qualification check
            if (instructor.qualifications && course.subject) {
                return instructor.qualifications.toLowerCase().includes(course.subject.toLowerCase());
            }
            
            return false;
        });
    }

    findCompatibleFacilities(course, facilities) {
        return facilities.filter(facility => {
            // Check capacity
            if (facility.capacity < (course.expected_students || 0)) return false;
            
            // Check facility type requirements
            const requiredType = course.facility_type || 'CLASSROOM';
            if (facility.type !== requiredType && facility.type !== 'CLASSROOM') return false;
            
            // Check availability
            if (facility.status !== 'AVAILABLE') return false;
            
            return true;
        });
    }

    checkAssignmentConstraints(course, instructor, facility, constraints) {
        // Check instructor load
        if (instructor.currentLoad >= constraints.maxInstructorLoad) return false;
        
        // Check facility capacity
        if (facility.capacity < course.expected_students) return false;
        
        // Additional constraint checks would go here
        
        return true;
    }

    findOptimalTimeSlot(instructor, facility, course) {
        // Simplified time slot finding
        // In practice, this would check actual availability matrices
        return {
            day: 'Monday',
            startTime: '10:00',
            endTime: '11:00'
        };
    }

    calculateAssignmentUtilization(course, instructor, facility) {
        const studentCapacityRatio = (course.expected_students || 0) / facility.capacity;
        const instructorLoadRatio = instructor.currentLoad / this.constraints.maxInstructorLoad;
        
        return (studentCapacityRatio + instructorLoadRatio) / 2 * 100;
    }

    calculateAssignmentQuality(course, instructor, facility) {
        let quality = 50; // Base quality
        
        // Instructor qualification match
        quality += instructor.qualificationScore * 0.3;
        
        // Facility suitability
        if (facility.type === course.facility_type) quality += 20;
        
        // Capacity efficiency
        const capacityRatio = (course.expected_students || 0) / facility.capacity;
        if (capacityRatio >= 0.7 && capacityRatio <= 0.9) quality += 15;
        
        return quality;
    }

    calculateBalancedScore(course, data) {
        const cost = (course.instructor_cost + course.classroom_cost) / (course.expected_students || 1);
        const priority = course.priority || 50;
        const complexity = course.complexity || 1;
        
        return (priority * complexity) / (cost / 1000); // Normalize cost
    }

    updateResourceAvailability(assignment, data) {
        // Update instructor load
        const instructor = data.instructors.find(i => i.id === assignment.instructorId);
        if (instructor) {
            instructor.currentLoad += 1;
            instructor.assignedCourses.push(assignment.courseId);
        }
        
        // Update facility utilization
        const facility = data.facilities.find(f => f.id === assignment.facilityId);
        if (facility) {
            facility.currentUtilization += 1;
            facility.scheduledSlots.push(assignment.timeSlot);
        }
    }

    calculateTotalUtilization(assignments, data) {
        const totalInstructors = data.instructors.length;
        const totalFacilities = data.facilities.length;
        const usedInstructors = new Set(assignments.map(a => a.instructorId)).size;
        const usedFacilities = new Set(assignments.map(a => a.facilityId)).size;
        
        return ((usedInstructors / totalInstructors) + (usedFacilities / totalFacilities)) / 2 * 100;
    }

    calculateQualityScore(assignments) {
        if (assignments.length === 0) return 0;
        
        const totalQuality = assignments.reduce((sum, assignment) => {
            return sum + (assignment.qualityScore || 50);
        }, 0);
        
        return totalQuality / assignments.length;
    }

    calculateOverallBalanceScore(assignments, data) {
        if (assignments.length === 0) return 0;
        
        const avgCost = assignments.reduce((sum, a) => sum + (a.cost || 0), 0) / assignments.length;
        const avgUtilization = this.calculateTotalUtilization(assignments, data);
        const avgQuality = this.calculateQualityScore(assignments);
        
        // Balanced score considering all factors
        return (avgQuality * 0.4) + (avgUtilization * 0.3) + ((10000 / avgCost) * 0.3);
    }

    /**
     * Post-process allocation results
     */
    async postProcessAllocation(allocation, data) {
        const finalPlan = {
            ...allocation,
            summary: {
                totalAssignments: allocation.assignments.length,
                unassignedCourses: data.courses.length - allocation.assignments.length,
                resourceUtilization: this.calculateFinalUtilization(allocation.assignments, data),
                costAnalysis: this.calculateFinalCostAnalysis(allocation.assignments),
                qualityMetrics: this.calculateFinalQualityMetrics(allocation.assignments)
            },
            recommendations: this.generateAllocationRecommendations(allocation, data),
            warnings: this.generateAllocationWarnings(allocation, data)
        };

        return finalPlan;
    }

    calculateFinalUtilization(assignments, data) {
        return {
            instructors: this.calculateTotalUtilization(assignments, data),
            facilities: this.calculateTotalUtilization(assignments, data),
            equipment: 0 // Placeholder for equipment utilization
        };
    }

    calculateFinalCostAnalysis(assignments) {
        const totalCost = assignments.reduce((sum, a) => sum + (a.cost || 0), 0);
        const avgCost = assignments.length > 0 ? totalCost / assignments.length : 0;
        
        return {
            totalCost,
            averageCostPerCourse: avgCost,
            costDistribution: this.calculateCostDistribution(assignments)
        };
    }

    calculateCostDistribution(assignments) {
        const distribution = {};
        assignments.forEach(assignment => {
            const range = this.getCostRange(assignment.cost || 0);
            distribution[range] = (distribution[range] || 0) + 1;
        });
        return distribution;
    }

    getCostRange(cost) {
        if (cost < 5000) return 'Low (< $5,000)';
        if (cost < 10000) return 'Medium ($5,000 - $10,000)';
        if (cost < 15000) return 'High ($10,000 - $15,000)';
        return 'Very High (> $15,000)';
    }

    calculateFinalQualityMetrics(assignments) {
        return {
            averageQualityScore: this.calculateQualityScore(assignments),
            qualityDistribution: this.calculateQualityDistribution(assignments)
        };
    }

    calculateQualityDistribution(assignments) {
        const distribution = { excellent: 0, good: 0, fair: 0, poor: 0 };
        
        assignments.forEach(assignment => {
            const quality = assignment.qualityScore || 50;
            if (quality >= 80) distribution.excellent++;
            else if (quality >= 70) distribution.good++;
            else if (quality >= 60) distribution.fair++;
            else distribution.poor++;
        });
        
        return distribution;
    }

    generateAllocationRecommendations(allocation, data) {
        const recommendations = [];
        
        const unassignedCount = data.courses.length - allocation.assignments.length;
        if (unassignedCount > 0) {
            recommendations.push(`${unassignedCount} courses could not be assigned - consider hiring additional instructors or expanding facilities`);
        }
        
        const utilization = this.calculateTotalUtilization(allocation.assignments, data);
        if (utilization < 70) {
            recommendations.push('Resource utilization is below optimal - consider consolidating or reducing resources');
        }
        
        return recommendations;
    }

    generateAllocationWarnings(allocation, data) {
        const warnings = [];
        
        // Check for overloaded instructors
        const overloadedInstructors = data.instructors.filter(i => i.currentLoad > this.constraints.maxInstructorLoad);
        if (overloadedInstructors.length > 0) {
            warnings.push(`${overloadedInstructors.length} instructors are overloaded`);
        }
        
        // Check for underutilized facilities
        const underutilizedFacilities = data.facilities.filter(f => f.currentUtilization === 0);
        if (underutilizedFacilities.length > 0) {
            warnings.push(`${underutilizedFacilities.length} facilities are not being used`);
        }
        
        return warnings;
    }
}

module.exports = ResourceAllocator;
