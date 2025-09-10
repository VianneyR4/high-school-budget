/**
 * Advanced Cost Calculator for School Budget Management
 * Handles complex cost structures, depreciation, and financial modeling
 */

class CostCalculator {
    constructor() {
        this.costTypes = {
            INSTRUCTOR_DIFFERENTIAL: 'instructor_differential',
            FACILITY_OVERHEAD: 'facility_overhead',
            EQUIPMENT_DEPRECIATION: 'equipment_depreciation',
            UTILITIES: 'utilities',
            MAINTENANCE: 'maintenance',
            ADMINISTRATIVE: 'administrative'
        };

        this.depreciationMethods = {
            STRAIGHT_LINE: 'straight_line',
            DECLINING_BALANCE: 'declining_balance',
            UNITS_OF_PRODUCTION: 'units_of_production'
        };
    }

    /**
     * Calculate comprehensive course costs including all factors
     * @param {Object} course - Course details
     * @param {Object} instructor - Instructor details
     * @param {Object} facility - Facility details
     * @param {Array} equipment - Equipment used
     * @param {Object} costStructures - Department cost structures
     * @returns {Object} Detailed cost breakdown
     */
    calculateComprehensiveCost(course, instructor, facility, equipment = [], costStructures = {}) {
        const costBreakdown = {
            instructorCosts: this.calculateInstructorCosts(course, instructor, costStructures),
            facilityCosts: this.calculateFacilityCosts(course, facility, costStructures),
            equipmentCosts: this.calculateEquipmentCosts(equipment, course.expected_students),
            overheadCosts: this.calculateOverheadCosts(course, costStructures),
            totalCost: 0,
            costPerStudent: 0,
            costPerCreditHour: 0
        };

        // Calculate total cost
        costBreakdown.totalCost = 
            costBreakdown.instructorCosts.total +
            costBreakdown.facilityCosts.total +
            costBreakdown.equipmentCosts.total +
            costBreakdown.overheadCosts.total;

        // Calculate per-unit costs
        costBreakdown.costPerStudent = course.expected_students > 0 ? 
            costBreakdown.totalCost / course.expected_students : 0;

        const creditHours = course.credit_hours || 3; // Default 3 credit hours
        costBreakdown.costPerCreditHour = creditHours > 0 ? 
            costBreakdown.totalCost / (course.expected_students * creditHours) : 0;

        return costBreakdown;
    }

    /**
     * Calculate instructor costs with differentials
     */
    calculateInstructorCosts(course, instructor, costStructures) {
        const baseCost = course.instructor_cost || 0;
        const hoursPerSemester = course.hours_per_week * 15 || 45; // 15 weeks default semester

        let costs = {
            baseSalary: 0,
            benefits: 0,
            differential: 0,
            total: 0
        };

        // Calculate base salary based on employment type
        switch (instructor.employment_type) {
            case 'FULL_TIME':
                costs.baseSalary = baseCost;
                costs.benefits = baseCost * 0.3; // 30% benefits
                break;
            case 'PART_TIME':
                costs.baseSalary = baseCost * 0.8;
                costs.benefits = baseCost * 0.15; // 15% benefits
                break;
            case 'ADJUNCT':
                costs.baseSalary = (instructor.hourly_rate || 50) * hoursPerSemester;
                costs.benefits = costs.baseSalary * 0.05; // 5% benefits
                break;
            case 'CONTRACT':
                costs.baseSalary = baseCost * 1.2;
                costs.benefits = 0; // No benefits for contractors
                break;
            default:
                costs.baseSalary = baseCost;
                costs.benefits = baseCost * 0.2;
        }

        // Apply instructor differentials from cost structures
        const differential = this.getInstructorDifferential(instructor, costStructures);
        costs.differential = costs.baseSalary * differential;

        costs.total = costs.baseSalary + costs.benefits + costs.differential;

        return costs;
    }

    /**
     * Calculate facility costs including utilities and maintenance
     */
    calculateFacilityCosts(course, facility, costStructures) {
        const hoursPerSemester = course.hours_per_week * 15 || 45;
        
        let costs = {
            baseRental: 0,
            utilities: 0,
            maintenance: 0,
            overhead: 0,
            total: 0
        };

        // Base facility cost
        costs.baseRental = (facility.hourly_cost || 0) * hoursPerSemester;

        // Utilities cost (proportional to usage)
        const annualUtilities = facility.utilities_cost_annual || 0;
        costs.utilities = (annualUtilities / (52 * 40)) * hoursPerSemester; // Assume 40 hours/week usage

        // Maintenance cost (proportional to usage)
        const annualMaintenance = facility.maintenance_cost_annual || 0;
        costs.maintenance = (annualMaintenance / (52 * 40)) * hoursPerSemester;

        // Facility overhead from cost structures
        const overheadRate = this.getFacilityOverheadRate(facility, costStructures);
        costs.overhead = costs.baseRental * overheadRate;

        costs.total = costs.baseRental + costs.utilities + costs.maintenance + costs.overhead;

        return costs;
    }

    /**
     * Calculate equipment costs including depreciation
     */
    calculateEquipmentCosts(equipment, expectedStudents) {
        let costs = {
            depreciation: 0,
            maintenance: 0,
            perStudentAllocation: 0,
            total: 0
        };

        equipment.forEach(item => {
            // Calculate depreciation
            const depreciation = this.calculateDepreciation(
                item.purchase_cost,
                item.purchase_date,
                item.depreciation_rate,
                this.depreciationMethods.STRAIGHT_LINE
            );
            
            // Allocate depreciation based on usage (semester basis)
            const semesterDepreciation = depreciation.annualDepreciation / 2;
            costs.depreciation += semesterDepreciation;

            // Add maintenance costs
            const semesterMaintenance = (item.maintenance_cost_annual || 0) / 2;
            costs.maintenance += semesterMaintenance;
        });

        // Calculate per-student equipment allocation
        costs.perStudentAllocation = expectedStudents > 0 ? 
            (costs.depreciation + costs.maintenance) / expectedStudents : 0;

        costs.total = costs.depreciation + costs.maintenance;

        return costs;
    }

    /**
     * Calculate overhead costs (administrative, general)
     */
    calculateOverheadCosts(course, costStructures) {
        const directCosts = (course.instructor_cost || 0) + (course.classroom_cost || 0);
        
        let costs = {
            administrative: 0,
            general: 0,
            total: 0
        };

        // Administrative overhead (typically 10-15% of direct costs)
        const adminRate = this.getOverheadRate('administrative', costStructures) || 0.12;
        costs.administrative = directCosts * adminRate;

        // General overhead (utilities, insurance, etc.)
        const generalRate = this.getOverheadRate('general', costStructures) || 0.08;
        costs.general = directCosts * generalRate;

        costs.total = costs.administrative + costs.general;

        return costs;
    }

    /**
     * Calculate equipment depreciation using various methods
     */
    calculateDepreciation(purchaseCost, purchaseDate, depreciationRate, method = 'straight_line') {
        const currentDate = new Date();
        const purchaseDateObj = new Date(purchaseDate);
        const yearsOwned = (currentDate - purchaseDateObj) / (1000 * 60 * 60 * 24 * 365.25);

        let depreciation = {
            method: method,
            yearsOwned: yearsOwned,
            annualDepreciation: 0,
            accumulatedDepreciation: 0,
            currentValue: purchaseCost
        };

        switch (method) {
            case this.depreciationMethods.STRAIGHT_LINE:
                depreciation.annualDepreciation = purchaseCost * depreciationRate;
                depreciation.accumulatedDepreciation = Math.min(
                    depreciation.annualDepreciation * yearsOwned,
                    purchaseCost * 0.9 // Max 90% depreciation
                );
                break;

            case this.depreciationMethods.DECLINING_BALANCE:
                // Double declining balance method
                const decliningRate = depreciationRate * 2;
                let remainingValue = purchaseCost;
                let totalDepreciation = 0;
                
                for (let year = 0; year < Math.floor(yearsOwned); year++) {
                    const yearlyDepreciation = remainingValue * decliningRate;
                    totalDepreciation += yearlyDepreciation;
                    remainingValue -= yearlyDepreciation;
                }
                
                depreciation.annualDepreciation = remainingValue * decliningRate;
                depreciation.accumulatedDepreciation = totalDepreciation;
                break;

            case this.depreciationMethods.UNITS_OF_PRODUCTION:
                // Simplified units of production (based on usage hours)
                const estimatedLifeHours = 10000; // Example: 10,000 hours
                const actualUsageHours = yearsOwned * 2000; // Assume 2000 hours/year
                depreciation.annualDepreciation = (purchaseCost / estimatedLifeHours) * 2000;
                depreciation.accumulatedDepreciation = (purchaseCost / estimatedLifeHours) * actualUsageHours;
                break;
        }

        depreciation.currentValue = Math.max(
            purchaseCost - depreciation.accumulatedDepreciation,
            purchaseCost * 0.1 // Minimum 10% residual value
        );

        return depreciation;
    }

    /**
     * Calculate cost per credit hour for different scenarios
     */
    calculateCostPerCreditHour(departmentCosts, totalCreditHours) {
        if (totalCreditHours === 0) return 0;

        return {
            total: departmentCosts.total / totalCreditHours,
            instructor: departmentCosts.instructor / totalCreditHours,
            facility: departmentCosts.facility / totalCreditHours,
            equipment: departmentCosts.equipment / totalCreditHours,
            overhead: departmentCosts.overhead / totalCreditHours
        };
    }

    /**
     * Calculate utilization rate analytics
     */
    calculateUtilizationRates(resources, schedules) {
        const utilization = {
            instructors: {},
            facilities: {},
            equipment: {},
            overall: {}
        };

        // Instructor utilization
        const totalInstructorHours = resources.instructors.length * 40 * 15; // 40 hours/week, 15 weeks
        const usedInstructorHours = schedules.reduce((total, schedule) => {
            return total + (schedule.hours_per_week * 15);
        }, 0);
        
        utilization.instructors = {
            totalAvailable: totalInstructorHours,
            totalUsed: usedInstructorHours,
            utilizationRate: (usedInstructorHours / totalInstructorHours) * 100,
            efficiency: this.calculateEfficiencyScore(usedInstructorHours, totalInstructorHours)
        };

        // Facility utilization
        const totalFacilityHours = resources.facilities.length * 50 * 15; // 50 hours/week, 15 weeks
        const usedFacilityHours = schedules.reduce((total, schedule) => {
            return total + (schedule.hours_per_week * 15);
        }, 0);

        utilization.facilities = {
            totalAvailable: totalFacilityHours,
            totalUsed: usedFacilityHours,
            utilizationRate: (usedFacilityHours / totalFacilityHours) * 100,
            efficiency: this.calculateEfficiencyScore(usedFacilityHours, totalFacilityHours)
        };

        // Overall utilization
        utilization.overall = {
            averageUtilization: (utilization.instructors.utilizationRate + utilization.facilities.utilizationRate) / 2,
            efficiency: (utilization.instructors.efficiency + utilization.facilities.efficiency) / 2
        };

        return utilization;
    }

    /**
     * Generate budget variance analysis
     */
    generateVarianceAnalysis(budgeted, actual, period) {
        const variance = {
            period: period,
            totalVariance: actual.total - budgeted.total,
            totalVariancePercent: ((actual.total - budgeted.total) / budgeted.total) * 100,
            categoryVariances: {},
            analysis: {
                favorableVariances: [],
                unfavorableVariances: [],
                significantVariances: []
            }
        };

        // Calculate variances by category
        Object.keys(budgeted).forEach(category => {
            if (category !== 'total') {
                const categoryVariance = (actual[category] || 0) - (budgeted[category] || 0);
                const categoryVariancePercent = budgeted[category] !== 0 ? 
                    (categoryVariance / budgeted[category]) * 100 : 0;

                variance.categoryVariances[category] = {
                    budgeted: budgeted[category],
                    actual: actual[category] || 0,
                    variance: categoryVariance,
                    variancePercent: categoryVariancePercent
                };

                // Classify variances
                if (Math.abs(categoryVariancePercent) > 10) {
                    variance.analysis.significantVariances.push({
                        category,
                        variance: categoryVariance,
                        percent: categoryVariancePercent
                    });
                }

                if (categoryVariance < 0) {
                    variance.analysis.favorableVariances.push(category);
                } else if (categoryVariance > 0) {
                    variance.analysis.unfavorableVariances.push(category);
                }
            }
        });

        return variance;
    }

    /**
     * Helper methods
     */
    getInstructorDifferential(instructor, costStructures) {
        // Look up instructor differential from cost structures
        const differential = costStructures[this.costTypes.INSTRUCTOR_DIFFERENTIAL];
        if (!differential) return 0;

        // Apply differential based on instructor qualifications, experience, etc.
        let rate = 0;
        if (instructor.qualifications && instructor.qualifications.includes('PhD')) {
            rate += 0.15; // 15% for PhD
        }
        if (instructor.qualifications && instructor.qualifications.includes('Masters')) {
            rate += 0.08; // 8% for Masters
        }

        return rate;
    }

    getFacilityOverheadRate(facility, costStructures) {
        const overhead = costStructures[this.costTypes.FACILITY_OVERHEAD];
        if (!overhead) return 0.1; // Default 10%

        // Different rates for different facility types
        switch (facility.type) {
            case 'LAB':
                return 0.2; // 20% for labs
            case 'AUDITORIUM':
                return 0.15; // 15% for auditoriums
            case 'CLASSROOM':
            default:
                return 0.1; // 10% for regular classrooms
        }
    }

    getOverheadRate(type, costStructures) {
        const overhead = costStructures[type];
        return overhead ? overhead.rate : null;
    }

    calculateEfficiencyScore(used, available) {
        const utilization = used / available;
        
        // Optimal utilization is around 75-85%
        if (utilization >= 0.75 && utilization <= 0.85) {
            return 100;
        } else if (utilization >= 0.65 && utilization < 0.75) {
            return 85;
        } else if (utilization >= 0.85 && utilization <= 0.95) {
            return 85;
        } else if (utilization < 0.65) {
            return Math.max(0, utilization * 100);
        } else {
            return Math.max(0, 100 - ((utilization - 0.95) * 200));
        }
    }

    /**
     * Multi-scenario cost modeling
     */
    generateScenarioAnalysis(baseScenario, variations) {
        const scenarios = {
            base: baseScenario,
            optimistic: this.applyScenarioVariation(baseScenario, variations.optimistic),
            pessimistic: this.applyScenarioVariation(baseScenario, variations.pessimistic),
            realistic: this.applyScenarioVariation(baseScenario, variations.realistic)
        };

        return {
            scenarios,
            comparison: this.compareScenarios(scenarios),
            recommendations: this.generateScenarioRecommendations(scenarios)
        };
    }

    applyScenarioVariation(baseScenario, variation) {
        const scenario = JSON.parse(JSON.stringify(baseScenario)); // Deep copy
        
        Object.keys(variation).forEach(key => {
            if (scenario[key] && typeof scenario[key] === 'number') {
                scenario[key] *= (1 + variation[key]);
            }
        });

        return scenario;
    }

    compareScenarios(scenarios) {
        const comparison = {};
        const baseTotal = scenarios.base.totalCost;

        Object.keys(scenarios).forEach(scenarioName => {
            if (scenarioName !== 'base') {
                comparison[scenarioName] = {
                    totalCost: scenarios[scenarioName].totalCost,
                    difference: scenarios[scenarioName].totalCost - baseTotal,
                    percentDifference: ((scenarios[scenarioName].totalCost - baseTotal) / baseTotal) * 100
                };
            }
        });

        return comparison;
    }

    generateScenarioRecommendations(scenarios) {
        const recommendations = [];
        
        const optimisticSavings = scenarios.base.totalCost - scenarios.optimistic.totalCost;
        const pessimisticIncrease = scenarios.pessimistic.totalCost - scenarios.base.totalCost;

        if (optimisticSavings > 0) {
            recommendations.push(`Potential savings of $${optimisticSavings.toFixed(2)} in optimistic scenario`);
        }

        if (pessimisticIncrease > scenarios.base.totalCost * 0.2) {
            recommendations.push('High risk scenario shows >20% cost increase - consider risk mitigation');
        }

        return recommendations;
    }
}

module.exports = CostCalculator;
