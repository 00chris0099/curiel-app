const { Alert, Suspension, User, Inspection } = require('../models');
const { AppError } = require('../middlewares/errorHandler');
const { Op } = require('sequelize');

class AlertService {
    /**
     * Crear una alerta
     */
    async createAlert(data, supervisorId) {
        const { inspectionId, suspensionId, gravityLevel, title, description } = data;

        if (inspectionId) {
            const inspection = await Inspection.findByPk(inspectionId);
            if (!inspection) {
                throw new AppError('Inspeccion no encontrada', 404, 'INSPECTION_NOT_FOUND');
            }
        }

        if (suspensionId) {
            const suspension = await Suspension.findByPk(suspensionId);
            if (!suspension) {
                throw new AppError('Suspension no encontrada', 404, 'SUSPENSION_NOT_FOUND');
            }
        }

        const alert = await Alert.create({
            inspectionId: inspectionId || null,
            suspensionId: suspensionId || null,
            supervisorId,
            gravityLevel,
            title,
            description,
            notifiedUsers: []
        });

        return alert;
    }

    /**
     * Obtener todas las alertas con filtros
     */
    async getAllAlerts(filters = {}) {
        const { status, gravityLevel, page = 1, limit = 20 } = filters;

        const where = {};

        if (status) where.status = status;
        if (gravityLevel) where.gravityLevel = gravityLevel;

        const offset = (page - 1) * limit;

        const { count, rows } = await Alert.findAndCountAll({
            where,
            include: [
                { model: User, as: 'supervisor', attributes: ['id', 'fullName', 'email'] },
                { model: Inspection, as: 'inspection', attributes: ['id', 'projectName', 'status'] },
                { model: Suspension, as: 'suspension', attributes: ['id', 'reason', 'status'] }
            ],
            limit: parseInt(limit),
            offset: parseInt(offset),
            order: [['createdAt', 'DESC']]
        });

        return {
            alerts: rows,
            pagination: {
                total: count,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(count / limit)
            }
        };
    }

    /**
     * Obtener alerta por ID
     */
    async getAlertById(id) {
        const alert = await Alert.findByPk(id, {
            include: [
                { model: User, as: 'supervisor', attributes: ['id', 'fullName', 'email'] },
                { model: Inspection, as: 'inspection', attributes: ['id', 'projectName', 'status'] },
                { model: Suspension, as: 'suspension', attributes: ['id', 'reason', 'status', 'description'] }
            ]
        });

        if (!alert) {
            throw new AppError('Alerta no encontrada', 404, 'ALERT_NOT_FOUND');
        }

        return alert;
    }

    /**
     * Actualizar estado de alerta
     */
    async updateAlert(id, data) {
        const alert = await Alert.findByPk(id);

        if (!alert) {
            throw new AppError('Alerta no encontrada', 404, 'ALERT_NOT_FOUND');
        }

        if (data.status) alert.status = data.status;
        if (data.gravityLevel) alert.gravityLevel = data.gravityLevel;

        await alert.save();
        return alert;
    }

    /**
     * Obtener alertas abiertas por nivel de gravedad
     */
    async getOpenAlertsByGravity(gravityLevel) {
        return Alert.findAll({
            where: { status: 'abierta', gravityLevel },
            include: [
                { model: User, as: 'supervisor', attributes: ['id', 'fullName'] },
                { model: Inspection, as: 'inspection', attributes: ['id', 'projectName'] }
            ],
            order: [['createdAt', 'DESC']]
        });
    }
}

module.exports = new AlertService();
