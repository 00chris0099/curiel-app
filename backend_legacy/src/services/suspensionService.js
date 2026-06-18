const { Suspension, User, Alert, Role } = require('../models');
const { AppError } = require('../middlewares/errorHandler');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');

class SuspensionService {
    /**
     * Crear una suspension
     */
    async createSuspension(data, supervisorId) {
        const { inspectorId, reason, description, gravityLevel, evidence } = data;

        // Verificar que el inspector existe y tiene el rol
        const inspector = await User.findByPk(inspectorId, {
            include: [{ model: Role, as: 'roles' }]
        });

        if (!inspector) {
            throw new AppError('Inspector no encontrado', 404, 'INSPECTOR_NOT_FOUND');
        }

        const hasInspectorRole = inspector.roles.some(r => r.name === 'inspector');
        if (!hasInspectorRole) {
            throw new AppError('El usuario no tiene rol de inspector', 400, 'NOT_INSPECTOR');
        }

        // Verificar que no tenga suspension activa
        const activeSuspension = await Suspension.findOne({
            where: { inspectorId, status: 'activa' }
        });

        if (activeSuspension) {
            throw new AppError('El inspector ya tiene una suspension activa', 409, 'ACTIVE_SUSPENSION');
        }

        const suspension = await Suspension.create({
            inspectorId,
            supervisorId,
            reason,
            description,
            gravityLevel,
            evidence: evidence || [],
            status: 'activa'
        });

        // Reasignar inspecciones pendientes automaticamente
        const reassignResult = await this.reassignPendingInspections(inspectorId);

        return { ...suspension.toJSON(), reassignedInspections: reassignResult.count };
    }

    /**
     * Reasignar inspecciones pendientes de un inspector suspendido a otro disponible
     */
    async reassignPendingInspections(suspendedInspectorId) {
        const Inspection = require('../models').Inspection;

        // Encontrar inspecciones pendientes o en proceso del inspector suspendido
        const pendingInspections = await Inspection.findAll({
            where: {
                inspectorId: suspendedInspectorId,
                status: { [Op.in]: ['pendiente', 'en_proceso'] }
            }
        });

        if (pendingInspections.length === 0) {
            return { count: 0, inspections: [] };
        }

        // Encontrar inspectores disponibles (activos, no suspendidos, distintos al suspendido)
        const suspendedUserIds = (await Suspension.findAll({
            where: { status: 'activa' },
            attributes: ['inspectorId']
        })).map(s => s.inspectorId);

        const excludedIds = [suspendedInspectorId, ...suspendedUserIds];

        const availableInspectors = await User.findAll({
            include: [
                { model: Role, as: 'roles', where: { name: 'inspector' } }
            ],
            where: {
                isActive: true,
                id: { [Op.notIn]: excludedIds }
            }
        });

        if (availableInspectors.length === 0) {
            return { count: 0, inspections: [], warning: 'No hay inspectores disponibles para reasignar' };
        }

        // Reasignar cada inspeccion al inspector con menos inspecciones asignadas
        const reassigned = [];
        for (const inspection of pendingInspections) {
            // Contar inspecciones activas de cada inspector disponible
            const inspectorLoads = await Promise.all(
                availableInspectors.map(async (insp) => {
                    const count = await Inspection.count({
                        where: {
                            inspectorId: insp.id,
                            status: { [Op.in]: ['pendiente', 'en_proceso'] }
                        }
                    });
                    return { inspector: insp, count };
                })
            );

            // Seleccionar el que tenga menos carga
            inspectorLoads.sort((a, b) => a.count - b.count);
            const bestInspector = inspectorLoads[0].inspector;

            inspection.inspectorId = bestInspector.id;
            await inspection.save();
            reassigned.push({
                inspectionId: inspection.id,
                projectName: inspection.projectName,
                newInspectorId: bestInspector.id,
                newInspectorName: bestInspector.fullName
            });
        }

        return { count: reassigned.length, inspections: reassigned };
    }

    /**
     * Obtener todas las suspensiones con filtros
     */
    async getAllSuspensions(filters = {}) {
        const { status, inspectorId, page = 1, limit = 20 } = filters;

        const where = {};

        if (status) where.status = status;
        if (inspectorId) where.inspectorId = inspectorId;

        const offset = (page - 1) * limit;

        const { count, rows } = await Suspension.findAndCountAll({
            where,
            include: [
                { model: User, as: 'inspector', attributes: ['id', 'fullName', 'email'] },
                { model: User, as: 'supervisor', attributes: ['id', 'fullName', 'email'] }
            ],
            limit: parseInt(limit),
            offset: parseInt(offset),
            order: [['createdAt', 'DESC']]
        });

        return {
            suspensions: rows,
            pagination: {
                total: count,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(count / limit)
            }
        };
    }

    /**
     * Obtener suspension por ID
     */
    async getSuspensionById(id) {
        const suspension = await Suspension.findByPk(id, {
            include: [
                { model: User, as: 'inspector', attributes: ['id', 'fullName', 'email'] },
                { model: User, as: 'supervisor', attributes: ['id', 'fullName', 'email'] },
                { model: Alert, as: 'alerts' }
            ]
        });

        if (!suspension) {
            throw new AppError('Suspension no encontrada', 404, 'SUSPENSION_NOT_FOUND');
        }

        return suspension;
    }

    /**
     * Levantar una suspension (solo admin)
     */
    async liftSuspension(id) {
        const suspension = await Suspension.findByPk(id);

        if (!suspension) {
            throw new AppError('Suspension no encontrada', 404, 'SUSPENSION_NOT_FOUND');
        }

        if (suspension.status === 'levantada') {
            throw new AppError('La suspension ya fue levantada', 400, 'ALREADY_LIFTED');
        }

        suspension.status = 'levantada';
        await suspension.save();

        return suspension;
    }

    /**
     * Verificar si un inspector esta suspendido
     */
    async isInspectorSuspended(inspectorId) {
        const suspension = await Suspension.findOne({
            where: { inspectorId, status: 'activa' }
        });
        return !!suspension;
    }

    /**
     * Obtener inspectores suspendidos
     */
    async getSuspendedInspectors() {
        return Suspension.findAll({
            where: { status: 'activa' },
            include: [
                { model: User, as: 'inspector', attributes: ['id', 'fullName', 'email'] },
                { model: User, as: 'supervisor', attributes: ['id', 'fullName'] }
            ],
            order: [['createdAt', 'DESC']]
        });
    }
}

module.exports = new SuspensionService();
