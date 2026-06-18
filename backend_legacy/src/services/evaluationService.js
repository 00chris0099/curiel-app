const { Evaluation, User, Role } = require('../models');
const { AppError } = require('../middlewares/errorHandler');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');

class EvaluationService {
    /**
     * Calcular KPIs de un usuario para un rango de fechas
     */
    async calculateKPIs(userId, weekStart, weekEnd) {
        const user = await User.findByPk(userId, {
            include: [{ model: Role, as: 'roles' }]
        });

        if (!user) {
            throw new AppError('Usuario no encontrado', 404, 'USER_NOT_FOUND');
        }

        const userRole = user.roles[0]?.name;
        const Inspection = require('../models').Inspection;
        const InspectionPhoto = require('../models').Photo;
        const InspectionObservation = require('../models').InspectionObservation;

        const startDate = new Date(weekStart);
        const endDate = new Date(weekEnd);
        endDate.setHours(23, 59, 59, 999);

        if (userRole === 'inspector') {
            // KPIs para inspector
            const totalAssigned = await Inspection.count({
                where: {
                    inspectorId: userId,
                    createdAt: { [Op.between]: [startDate, endDate] }
                }
            });

            const completed = await Inspection.count({
                where: {
                    inspectorId: userId,
                    status: 'finalizada',
                    completedDate: { [Op.between]: [startDate, endDate] }
                }
            });

            const cancelled = await Inspection.count({
                where: {
                    inspectorId: userId,
                    status: 'cancelada',
                    updatedAt: { [Op.between]: [startDate, endDate] }
                }
            });

            // Tiempo promedio (en horas) - simplificado
            const inspections = await Inspection.findAll({
                where: {
                    inspectorId: userId,
                    status: 'finalizada',
                    completedDate: { [Op.between]: [startDate, endDate] }
                },
                attributes: ['scheduledDate', 'completedDate']
            });

            let avgTime = 0;
            if (inspections.length > 0) {
                const totalTime = inspections.reduce((sum, insp) => {
                    const diff = new Date(insp.completedDate) - new Date(insp.scheduledDate);
                    return sum + diff;
                }, 0);
                avgTime = totalTime / inspections.length / (1000 * 60 * 60); // hours
            }

            // Fotos promedio
            const totalPhotos = await InspectionPhoto.count({
                include: [{
                    model: Inspection,
                    as: 'inspection',
                    where: {
                        inspectorId: userId,
                        createdAt: { [Op.between]: [startDate, endDate] }
                    }
                }]
            });
            const avgPhotos = totalAssigned > 0 ? totalPhotos / totalAssigned : 0;

            // Observaciones criticas
            const criticalObs = await InspectionObservation.count({
                include: [{
                    model: Inspection,
                    as: 'inspection',
                    where: {
                        inspectorId: userId,
                        createdAt: { [Op.between]: [startDate, endDate] }
                    }
                }],
                where: { severity: 'critica' }
            });

            // Tasa de finalizacion
            const completionRate = totalAssigned > 0 ? (completed / totalAssigned) * 100 : 0;

            // Tasa de rechazo (inspecciones que volvieron de lista_revision a en_proceso)
            const rejectionRate = totalAssigned > 0 ? (cancelled / totalAssigned) * 100 : 0;

            // Score compuesto
            const compositeScore = (
                (completionRate * 0.3) +
                (Math.min(100, (100 - rejectionRate)) * 0.25) +
                (Math.min(100, avgPhotos * 3.33) * 0.15) +
                (Math.min(100, (100 - criticalObs * 5)) * 0.2) +
                (80 * 0.1) // satisfaccion placeholder
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
            // KPIs para arquitecto
            const created = await Inspection.count({
                where: {
                    createdById: userId,
                    createdAt: { [Op.between]: [startDate, endDate] }
                }
            });

            const finalized = await Inspection.count({
                where: {
                    createdById: userId,
                    status: 'finalizada',
                    completedDate: { [Op.between]: [startDate, endDate] }
                }
            });

            const approvalRate = created > 0 ? (finalized / created) * 100 : 0;

            // Tiempo promedio de revision
            const inspections = await Inspection.findAll({
                where: {
                    createdById: userId,
                    status: 'finalizada',
                    completedDate: { [Op.between]: [startDate, endDate] }
                },
                attributes: ['scheduledDate', 'completedDate']
            });

            let avgTime = 0;
            if (inspections.length > 0) {
                const totalTime = inspections.reduce((sum, insp) => {
                    const diff = new Date(insp.completedDate) - new Date(insp.scheduledDate);
                    return sum + diff;
                }, 0);
                avgTime = totalTime / inspections.length / (1000 * 60 * 60);
            }

            const compositeScore = (
                (approvalRate * 0.4) +
                (Math.min(100, (100 / Math.max(1, avgTime))) * 0.3) +
                (80 * 0.3) // satisfaccion placeholder
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

    /**
     * Generar evaluacion semanal automatica
     */
    async generateWeeklyEvaluation(userId, weekStart, weekEnd, supervisorId) {
        // Verificar que no exista ya una evaluacion para esta semana
        const existing = await Evaluation.findOne({
            where: {
                evaluatedUserId: userId,
                weekStart,
                weekEnd
            }
        });

        if (existing) {
            throw new AppError('Ya existe una evaluacion para esta semana', 409, 'EVALUATION_EXISTS');
        }

        const kpis = await this.calculateKPIs(userId, weekStart, weekEnd);

        const evaluation = await Evaluation.create({
            evaluatedUserId: userId,
            supervisorId,
            weekStart,
            weekEnd,
            ...kpis,
            status: 'borrador'
        });

        return evaluation;
    }

    /**
     * Generar evaluaciones masivas para todos los usuarios activos
     */
    async generateBulkWeeklyEvaluations(weekStart, weekEnd, supervisorId) {
        const users = await User.findAll({
            include: [{
                model: Role,
                as: 'roles',
                where: { name: { [Op.in]: ['inspector', 'arquitecto'] } }
            }],
            where: { isActive: true }
        });

        const results = [];
        for (const user of users) {
            try {
                const evaluation = await this.generateWeeklyEvaluation(
                    user.id, weekStart, weekEnd, supervisorId
                );
                results.push({ userId: user.id, evaluation, success: true });
            } catch (error) {
                results.push({ userId: user.id, error: error.message, success: false });
            }
        }

        return results;
    }

    /**
     * Obtener evaluaciones con filtros
     */
    async getAllEvaluations(filters = {}) {
        const { evaluatedUserId, supervisorId, status, page = 1, limit = 20 } = filters;

        const where = {};

        if (evaluatedUserId) where.evaluatedUserId = evaluatedUserId;
        if (supervisorId) where.supervisorId = supervisorId;
        if (status) where.status = status;

        const offset = (page - 1) * limit;

        const { count, rows } = await Evaluation.findAndCountAll({
            where,
            include: [
                { model: User, as: 'evaluatedUser', attributes: ['id', 'fullName', 'email'] },
                { model: User, as: 'supervisor', attributes: ['id', 'fullName', 'email'] }
            ],
            limit: parseInt(limit),
            offset: parseInt(offset),
            order: [['weekStart', 'DESC']]
        });

        return {
            evaluations: rows,
            pagination: {
                total: count,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(count / limit)
            }
        };
    }

    /**
     * Obtener evaluacion por ID
     */
    async getEvaluationById(id) {
        const evaluation = await Evaluation.findByPk(id, {
            include: [
                { model: User, as: 'evaluatedUser', attributes: ['id', 'fullName', 'email'] },
                { model: User, as: 'supervisor', attributes: ['id', 'fullName', 'email'] }
            ]
        });

        if (!evaluation) {
            throw new AppError('Evaluacion no encontrada', 404, 'EVALUATION_NOT_FOUND');
        }

        return evaluation;
    }

    /**
     * Actualizar evaluacion (notas, acciones, estado)
     */
    async updateEvaluation(id, data) {
        const evaluation = await Evaluation.findByPk(id);

        if (!evaluation) {
            throw new AppError('Evaluacion no encontrada', 404, 'EVALUATION_NOT_FOUND');
        }

        if (data.notes !== undefined) evaluation.notes = data.notes;
        if (data.actions !== undefined) evaluation.actions = data.actions;
        if (data.status) evaluation.status = data.status;

        await evaluation.save();
        return evaluation;
    }

    /**
     * Obtener ranking de inspectores para un periodo
     */
    async getInspectorRanking(weekStart, weekEnd) {
        const users = await User.findAll({
            include: [{
                model: Role,
                as: 'roles',
                where: { name: 'inspector' }
            }],
            where: { isActive: true }
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

    /**
     * Obtener ranking de arquitectos para un periodo
     */
    async getArchitectRanking(weekStart, weekEnd) {
        const users = await User.findAll({
            include: [{
                model: Role,
                as: 'roles',
                where: { name: 'arquitecto' }
            }],
            where: { isActive: true }
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
