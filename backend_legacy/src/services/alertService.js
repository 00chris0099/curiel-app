const { prisma } = require('../lib/databases');
const { AppError } = require('../middlewares/errorHandler');

class AlertService {
    async createAlert(data, supervisorId) {
        const { inspectionId, suspensionId, gravityLevel, title, description } = data;

        if (inspectionId) {
            const inspection = await prisma.inspecciones.inspection.findUnique({
                where: { id: inspectionId }
            });
            if (!inspection) {
                throw new AppError('Inspeccion no encontrada', 404, 'INSPECTION_NOT_FOUND');
            }
        }

        if (suspensionId) {
            const suspension = await prisma.alertas.suspension.findUnique({
                where: { id: suspensionId }
            });
            if (!suspension) {
                throw new AppError('Suspension no encontrada', 404, 'SUSPENSION_NOT_FOUND');
            }
        }

        return prisma.alertas.alert.create({
            data: {
                inspectionId: inspectionId || null,
                suspensionId: suspensionId || null,
                supervisorId,
                gravityLevel,
                title,
                description,
                notifiedUsers: []
            }
        });
    }

    async getAllAlerts(filters = {}) {
        const { status, gravityLevel, page = 1, limit = 20 } = filters;

        const where = {};
        if (status) where.status = status;
        if (gravityLevel) where.gravityLevel = gravityLevel;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [alerts, total] = await Promise.all([
            prisma.alertas.alert.findMany({
                where,
                take: parseInt(limit),
                skip,
                orderBy: { createdAt: 'desc' }
            }),
            prisma.alertas.alert.count({ where })
        ]);

        return {
            alerts,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    async getAlertById(id) {
        const alert = await prisma.alertas.alert.findUnique({
            where: { id }
        });

        if (!alert) {
            throw new AppError('Alerta no encontrada', 404, 'ALERT_NOT_FOUND');
        }

        return alert;
    }

    async updateAlert(id, data) {
        const alert = await prisma.alertas.alert.findUnique({
            where: { id }
        });

        if (!alert) {
            throw new AppError('Alerta no encontrada', 404, 'ALERT_NOT_FOUND');
        }

        const updateFields = {};
        if (data.status) updateFields.status = data.status;
        if (data.gravityLevel) updateFields.gravityLevel = data.gravityLevel;

        return prisma.alertas.alert.update({
            where: { id },
            data: updateFields
        });
    }

    async getOpenAlertsByGravity(gravityLevel) {
        return prisma.alertas.alert.findMany({
            where: { status: 'abierta', gravityLevel },
            orderBy: { createdAt: 'desc' }
        });
    }
}

module.exports = new AlertService();
