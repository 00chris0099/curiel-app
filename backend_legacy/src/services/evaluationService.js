const { prisma } = require('../lib/databases');
const { AppError } = require('../middlewares/errorHandler');

class EvaluationService {
    async calculateKPIs(userId, weekStart, weekEnd) {
        const user = await prisma.auth.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                roles: { select: { role: { select: { name: true } } } }
            }
        });

        if (!user) {
            throw new AppError('Usuario no encontrado', 404, 'USER_NOT_FOUND');
        }

        const userRole = user.roles[0]?.role.name;
        const startDate = new Date(weekStart);
        const endDate = new Date(weekEnd);
        endDate.setHours(23, 59, 59, 999);

        if (userRole === 'inspector') {
            const dateFilter = { gte: startDate, lte: endDate };

            const [totalAssigned, completed, cancelled] = await Promise.all([
                prisma.inspecciones.inspection.count({
                    where: { inspectorId: userId, createdAt: dateFilter }
                }),
                prisma.inspecciones.inspection.count({
                    where: { inspectorId: userId, status: 'finalizada', completedDate: dateFilter }
                }),
                prisma.inspecciones.inspection.count({
                    where: { inspectorId: userId, status: 'cancelada', updatedAt: dateFilter }
                })
            ]);

            const inspections = await prisma.inspecciones.inspection.findMany({
                where: { inspectorId: userId, status: 'finalizada', completedDate: dateFilter },
                select: { scheduledDate: true, completedDate: true }
            });

            let avgTime = 0;
            if (inspections.length > 0) {
                const totalTime = inspections.reduce((sum, insp) => {
                    return sum + (new Date(insp.completedDate) - new Date(insp.scheduledDate));
                }, 0);
                avgTime = totalTime / inspections.length / (1000 * 60 * 60);
            }

            const totalPhotos = await prisma.inspecciones.inspection.findMany({
                where: { inspectorId: userId, createdAt: dateFilter },
                select: { id: true }
            });
            const inspectionIds = totalPhotos.map(i => i.id);

            let photoCount = 0;
            if (inspectionIds.length > 0) {
                photoCount = await prisma.media.photo.count({
                    where: { inspectionId: { in: inspectionIds } }
                });
            }

            const avgPhotos = totalAssigned > 0 ? photoCount / totalAssigned : 0;

            let criticalObs = 0;
            if (inspectionIds.length > 0) {
                criticalObs = await prisma.inspecciones.inspectionObservation.count({
                    where: {
                        inspectionId: { in: inspectionIds },
                        severity: 'critica'
                    }
                });
            }

            const completionRate = totalAssigned > 0 ? (completed / totalAssigned) * 100 : 0;
            const rejectionRate = totalAssigned > 0 ? (cancelled / totalAssigned) * 100 : 0;

            const compositeScore = (
                (completionRate * 0.3) +
                (Math.min(100, (100 - rejectionRate)) * 0.25) +
                (Math.min(100, avgPhotos * 3.33) * 0.15) +
                (Math.min(100, (100 - criticalObs * 5)) * 0.2) +
                (80 * 0.1)
            );

            return {
                inspectionsCompleted: completed,
                avgTimePerInspection: Math.round(avgTime * 100) / 100,
                punctualityRate: completionRate,
                avgPhotosPerInspection: Math.round(avgPhotos * 100) / 100,
                criticalObservations: criticalObs,
                rejectionRate: Math.round(rejectionRate * 100) / 100,
                completionRate: Math.round(completionRate * 100) / 100,
                compositeScore: Math.round(compositeScore * 100) / 100
            };
        }

        if (userRole === 'arquitecto') {
            const dateFilter = { gte: startDate, lte: endDate };

            const [created, finalized] = await Promise.all([
                prisma.inspecciones.inspection.count({
                    where: { createdById: userId, createdAt: dateFilter }
                }),
                prisma.inspecciones.inspection.count({
                    where: { createdById: userId, status: 'finalizada', completedDate: dateFilter }
                })
            ]);

            const approvalRate = created > 0 ? (finalized / created) * 100 : 0;

            const inspections = await prisma.inspecciones.inspection.findMany({
                where: { createdById: userId, status: 'finalizada', completedDate: dateFilter },
                select: { scheduledDate: true, completedDate: true }
            });

            let avgTime = 0;
            if (inspections.length > 0) {
                const totalTime = inspections.reduce((sum, insp) => {
                    return sum + (new Date(insp.completedDate) - new Date(insp.scheduledDate));
                }, 0);
                avgTime = totalTime / inspections.length / (1000 * 60 * 60);
            }

            const compositeScore = (
                (approvalRate * 0.4) +
                (Math.min(100, (100 / Math.max(1, avgTime))) * 0.3) +
                (80 * 0.3)
            );

            return {
                inspectionsCompleted: created,
                avgTimePerInspection: Math.round(avgTime * 100) / 100,
                punctualityRate: Math.round(approvalRate * 100) / 100,
                avgPhotosPerInspection: 0,
                criticalObservations: 0,
                rejectionRate: 0,
                completionRate: Math.round(approvalRate * 100) / 100,
                compositeScore: Math.round(compositeScore * 100) / 100
            };
        }

        throw new AppError('Rol no soportado para evaluacion', 400, 'UNSUPPORTED_ROLE');
    }

    async generateWeeklyEvaluation(userId, weekStart, weekEnd, supervisorId) {
        const existing = await prisma.alertas.evaluation.findFirst({
            where: { evaluatedUserId: userId, weekStart, weekEnd }
        });

        if (existing) {
            throw new AppError('Ya existe una evaluacion para esta semana', 409, 'EVALUATION_EXISTS');
        }

        const kpis = await this.calculateKPIs(userId, weekStart, weekEnd);

        return prisma.alertas.evaluation.create({
            data: {
                evaluatedUserId: userId,
                supervisorId,
                weekStart,
                weekEnd,
                ...kpis,
                status: 'borrador'
            }
        });
    }

    async generateBulkWeeklyEvaluations(weekStart, weekEnd, supervisorId) {
        const userRoleRecords = await prisma.auth.userRole.findMany({
            where: {
                role: { name: { in: ['inspector', 'arquitecto'] } },
                user: { isActive: true }
            },
            select: { userId: true }
        });

        const userIds = [...new Set(userRoleRecords.map(ur => ur.userId))];
        const results = [];

        for (const userId of userIds) {
            try {
                const evaluation = await this.generateWeeklyEvaluation(userId, weekStart, weekEnd, supervisorId);
                results.push({ userId, evaluation, success: true });
            } catch (error) {
                results.push({ userId, error: error.message, success: false });
            }
        }

        return results;
    }

    async getAllEvaluations(filters = {}) {
        const { evaluatedUserId, supervisorId, status, page = 1, limit = 20 } = filters;

        const where = {};
        if (evaluatedUserId) where.evaluatedUserId = evaluatedUserId;
        if (supervisorId) where.supervisorId = supervisorId;
        if (status) where.status = status;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [evaluations, total] = await Promise.all([
            prisma.alertas.evaluation.findMany({
                where,
                take: parseInt(limit),
                skip,
                orderBy: { weekStart: 'desc' }
            }),
            prisma.alertas.evaluation.count({ where })
        ]);

        return {
            evaluations,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    async getEvaluationById(id) {
        const evaluation = await prisma.alertas.evaluation.findUnique({
            where: { id }
        });

        if (!evaluation) {
            throw new AppError('Evaluacion no encontrada', 404, 'EVALUATION_NOT_FOUND');
        }

        return evaluation;
    }

    async updateEvaluation(id, data) {
        const evaluation = await prisma.alertas.evaluation.findUnique({
            where: { id }
        });

        if (!evaluation) {
            throw new AppError('Evaluacion no encontrada', 404, 'EVALUATION_NOT_FOUND');
        }

        const updateFields = {};
        if (data.notes !== undefined) updateFields.notes = data.notes;
        if (data.actions !== undefined) updateFields.actions = data.actions;
        if (data.status) updateFields.status = data.status;

        return prisma.alertas.evaluation.update({
            where: { id },
            data: updateFields
        });
    }

    async getDashboardKPIs() {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - (now.getDay() === 0 ? 6 : now.getDay() - 1));
        startOfWeek.setHours(0, 0, 0, 0);

        const [
            totalActiveInspections,
            overdueInspections,
            completedThisMonth,
            totalThisMonth,
            cancelledThisMonth,
            activeInspectors,
            activeArchitects
        ] = await Promise.all([
            prisma.inspecciones.inspection.count({
                where: { status: { in: ['pendiente', 'en_proceso', 'lista_revision'] } }
            }),
            prisma.inspecciones.inspection.count({
                where: {
                    scheduledDate: { lt: now },
                    status: { notIn: ['finalizada', 'cancelada'] }
                }
            }),
            prisma.inspecciones.inspection.count({
                where: { status: 'finalizada', completedDate: { gte: startOfMonth, lte: now } }
            }),
            prisma.inspecciones.inspection.count({
                where: { createdAt: { gte: startOfMonth, lte: now } }
            }),
            prisma.inspecciones.inspection.count({
                where: { status: 'cancelada', updatedAt: { gte: startOfMonth, lte: now } }
            }),
            prisma.auth.userRole.count({
                where: { role: { name: 'inspector' }, user: { isActive: true } }
            }),
            prisma.auth.userRole.count({
                where: { role: { name: 'arquitecto' }, user: { isActive: true } }
            })
        ]);

        const cancellationRate = totalThisMonth > 0
            ? Math.round((cancelledThisMonth / totalThisMonth) * 100 * 100) / 100
            : 0;

        const completedThisWeek = await prisma.inspecciones.inspection.findMany({
            where: { status: 'finalizada', completedDate: { gte: startOfWeek, lte: now } },
            select: { scheduledDate: true, completedDate: true }
        });

        let avgTimeGeneral = 0;
        if (completedThisWeek.length > 0) {
            const totalTime = completedThisWeek.reduce((sum, insp) => {
                return sum + (new Date(insp.completedDate) - new Date(insp.scheduledDate));
            }, 0);
            avgTimeGeneral = Math.round((totalTime / completedThisWeek.length / (1000 * 60 * 60)) * 100) / 100;
        }

        const dailyProductivity = [];
        for (let i = 6; i >= 0; i--) {
            const day = new Date(now);
            day.setDate(now.getDate() - i);
            day.setHours(0, 0, 0, 0);
            const nextDay = new Date(day);
            nextDay.setDate(day.getDate() + 1);

            const count = await prisma.inspecciones.inspection.count({
                where: { completedDate: { gte: day, lt: nextDay }, status: 'finalizada' }
            });
            dailyProductivity.push({ date: day.toISOString().split('T')[0], count });
        }

        return {
            totalActiveInspections,
            overdueInspections,
            completedThisMonth,
            totalThisMonth,
            cancellationRate,
            avgTimeGeneral,
            activeInspectors,
            activeArchitects,
            dailyProductivity
        };
    }

    async getInspectorRanking(weekStart, weekEnd) {
        const userRoleRecords = await prisma.auth.userRole.findMany({
            where: { role: { name: 'inspector' }, user: { isActive: true } },
            select: { userId: true }
        });

        const userIds = [...new Set(userRoleRecords.map(ur => ur.userId))];
        const users = await prisma.auth.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, fullName: true }
        });

        const rankings = [];
        for (const user of users) {
            try {
                const kpis = await this.calculateKPIs(user.id, weekStart, weekEnd);
                rankings.push({
                    userId: user.id,
                    fullName: user.fullName,
                    score: kpis.compositeScore,
                    inspectionsCompleted: kpis.inspectionsCompleted,
                    punctualityRate: kpis.punctualityRate
                });
            } catch (error) {
                // skip
            }
        }

        return rankings.sort((a, b) => b.score - a.score);
    }

    async getArchitectRanking(weekStart, weekEnd) {
        const userRoleRecords = await prisma.auth.userRole.findMany({
            where: { role: { name: 'arquitecto' }, user: { isActive: true } },
            select: { userId: true }
        });

        const userIds = [...new Set(userRoleRecords.map(ur => ur.userId))];
        const users = await prisma.auth.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, fullName: true }
        });

        const rankings = [];
        for (const user of users) {
            try {
                const kpis = await this.calculateKPIs(user.id, weekStart, weekEnd);
                rankings.push({
                    userId: user.id,
                    fullName: user.fullName,
                    score: kpis.compositeScore,
                    inspectionsCreated: kpis.inspectionsCompleted,
                    approvalRate: kpis.completionRate
                });
            } catch (error) {
                // skip
            }
        }

        return rankings.sort((a, b) => b.score - a.score);
    }
}

module.exports = new EvaluationService();
