const { Inspection, User, Role, InspectionResponse, ChecklistItem, Photo, ChecklistTemplate } = require('../models');
const { AppError } = require('../middlewares/errorHandler');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');

const safeUserAttributes = {
    exclude: ['passwordHash', '_plainPassword']
};

/**
 * Servicio de gestión de inspecciones
 */
class InspectionService {
    /**
     * Obtener todas las inspecciones con filtros
     */
    async getAllInspections(filters = {}, userId, userRole, isMasterAdmin = false) {
        const { status, inspectorId, startDate, endDate, search, page = 1, limit = 10 } = filters;

        const where = {};

        // Si es inspector (y no es master admin), solo ver sus propias inspecciones
        if (!isMasterAdmin && userRole === 'inspector') {
            where.inspectorId = userId;
        }

        if (status) where.status = status;
        if (inspectorId && (userRole !== 'inspector' || isMasterAdmin)) where.inspectorId = inspectorId;

        if (startDate && endDate) {
            where.scheduledDate = {
                [Op.between]: [new Date(startDate), new Date(endDate)]
            };
        }

        if (search) {
            where[Op.or] = [
                { projectName: { [Op.iLike]: `%${search}%` } },
                { clientName: { [Op.iLike]: `%${search}%` } },
                { address: { [Op.iLike]: `%${search}%` } }
            ];
        }

        const offset = (page - 1) * limit;

        const { count, rows } = await Inspection.findAndCountAll({
            where,
            limit: parseInt(limit),
            offset: parseInt(offset),
            order: [['scheduledDate', 'DESC']],
            include: [
                {
                    model: User,
                    as: 'inspector',
                    attributes: safeUserAttributes
                },
                {
                    model: User,
                    as: 'creator',
                    attributes: safeUserAttributes
                }
            ]
        });

        return {
            inspections: rows,
            pagination: {
                total: count,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(count / limit)
            }
        };
    }

    /**
     * Obtener inspección por ID con todos sus datos relacionados
     */
    async getInspectionById(inspectionId, userId, userRole, isMasterAdmin = false) {
        const inspection = await Inspection.findByPk(inspectionId, {
            include: [
                {
                    model: User,
                    as: 'inspector',
                    attributes: safeUserAttributes
                },
                {
                    model: User,
                    as: 'creator',
                    attributes: safeUserAttributes
                },
                {
                    model: InspectionResponse,
                    as: 'responses',
                    include: [
                        {
                            model: ChecklistItem,
                            as: 'checklistItem'
                        }
                    ]
                },
                {
                    model: Photo,
                    as: 'photos'
                }
            ]
        });

        if (!inspection) {
            throw new AppError('Inspección no encontrada', 404, 'INSPECTION_NOT_FOUND');
        }

        // Verificar permisos (los master admin tienen acceso completo)
        if (!isMasterAdmin && userRole === 'inspector' && inspection.inspectorId !== userId) {
            throw new AppError('No tienes permisos para ver esta inspección', 403, 'FORBIDDEN');
        }

        return inspection;
    }

    /**
     * Crear nueva inspección
     */
    async createInspection(inspectionData, creatorId) {
        const {
            projectName,
            clientName,
            clientEmail,
            clientPhone,
            address,
            city,
            state,
            zipCode,
            inspectionType,
            scheduledDate,
            inspectorId,
            notes,
            latitude,
            longitude
        } = inspectionData;

        // Verificar que el inspector existe
        const inspector = await User.findByPk(inspectorId, {
            include: [{ model: Role, as: 'roles', attributes: ['name'] }]
        });
        if (!inspector) {
            throw new AppError('Inspector no encontrado', 404, 'INSPECTOR_NOT_FOUND');
        }

        const inspectorRoles = (inspector.roles || []).map((r) => r.name);
        if (!inspectorRoles.includes('inspector') && !inspectorRoles.includes('arquitecto')) {
            throw new AppError('El usuario asignado no es inspector ni arquitecto', 400, 'INVALID_INSPECTOR');
        }

        // Crear inspección
        const inspection = await Inspection.create({
            projectName,
            clientName,
            clientEmail,
            clientPhone,
            address,
            city,
            state,
            zipCode,
            inspectionType,
            scheduledDate,
            inspectorId,
            createdById: creatorId,
            notes,
            latitude,
            longitude,
            status: 'pendiente'
        });

        // Cargar relaciones
        await inspection.reload({
            include: [
                { model: User, as: 'inspector', attributes: safeUserAttributes },
                { model: User, as: 'creator', attributes: safeUserAttributes }
            ]
        });

        return inspection;
    }

    /**
     * Actualizar inspección
     */
    async updateInspection(inspectionId, updateData, userId, userRole, isMasterAdmin = false) {
        const inspection = await Inspection.findByPk(inspectionId);

        if (!inspection) {
            throw new AppError('Inspección no encontrada', 404, 'INSPECTION_NOT_FOUND');
        }

        // Verificar permisos (los master admin tienen acceso completo)
        if (!isMasterAdmin && userRole === 'inspector' && inspection.inspectorId !== userId) {
            throw new AppError('No tienes permisos para editar esta inspección', 403, 'FORBIDDEN');
        }

        // No permitir editar inspecciones finalizadas
        if (inspection.status === 'finalizada') {
            throw new AppError('No se puede editar una inspección finalizada', 400, 'INSPECTION_COMPLETED');
        }

        // Actualizar campos permitidos
        const allowedFields = [
            'projectName', 'clientName', 'clientEmail', 'clientPhone',
            'address', 'city', 'state', 'zipCode', 'inspectionType',
            'scheduledDate', 'notes', 'latitude', 'longitude'
        ];

        allowedFields.forEach(field => {
            if (updateData[field] !== undefined) {
                inspection[field] = updateData[field];
            }
        });

        // Solo admin/arquitecto/master admin puede reasignar inspector
        if (updateData.inspectorId && (userRole === 'admin' || userRole === 'arquitecto' || isMasterAdmin)) {
            const inspector = await User.findByPk(updateData.inspectorId);
            if (!inspector) {
                throw new AppError('Inspector no encontrado', 404, 'INSPECTOR_NOT_FOUND');
            }
            inspection.inspectorId = updateData.inspectorId;
        }

        await inspection.save();

        return inspection;
    }

    /**
     * Cambiar estado de inspección
     */
    async updateInspectionStatus(inspectionId, newStatus, userId, userRole, isMasterAdmin = false) {
        const inspection = await Inspection.findByPk(inspectionId);

        if (!inspection) {
            throw new AppError('Inspección no encontrada', 404, 'INSPECTION_NOT_FOUND');
        }

        // Verificar permisos (los master admin tienen acceso completo)
        if (!isMasterAdmin && userRole === 'inspector' && inspection.inspectorId !== userId) {
            throw new AppError('No tienes permisos para cambiar el estado', 403, 'FORBIDDEN');
        }

        const validStatuses = ['pendiente', 'en_proceso', 'finalizada', 'cancelada'];
        if (!validStatuses.includes(newStatus)) {
            throw new AppError('Estado inválido', 400, 'INVALID_STATUS');
        }

        const oldStatus = inspection.status;
        inspection.status = newStatus;

        // Si se finaliza, agregar fecha de completado
        if (newStatus === 'finalizada') {
            inspection.completedDate = new Date();
        }

        await inspection.save();

        return {
            inspection,
            oldStatus,
            newStatus
        };
    }

    /**
     * Eliminar inspección (solo admin)
     */
    async deleteInspection(inspectionId) {
        const inspection = await Inspection.findByPk(inspectionId);

        if (!inspection) {
            throw new AppError('Inspección no encontrada', 404, 'INSPECTION_NOT_FOUND');
        }

        if (inspection.status === 'finalizada') {
            throw new AppError('No se puede eliminar una inspección finalizada', 400, 'CANNOT_DELETE_COMPLETED');
        }

        await inspection.destroy();

        return inspection;
    }

    /**
     * Obtener estadísticas de inspecciones
     */
    async getInspectionStats(userId, userRole, isMasterAdmin = false) {
        const where = {};

        // Si es inspector (y no es master admin), solo ver sus propias estadísticas
        if (!isMasterAdmin && userRole === 'inspector') {
            where.inspectorId = userId;
        }

        const total = await Inspection.count({ where });
        const pendiente = await Inspection.count({ where: { ...where, status: 'pendiente' } });
        const enProceso = await Inspection.count({ where: { ...where, status: 'en_proceso' } });
        const finalizada = await Inspection.count({ where: { ...where, status: 'finalizada' } });
        const cancelada = await Inspection.count({ where: { ...where, status: 'cancelada' } });

        return {
            total,
            pendiente,
            en_proceso: enProceso,
            finalizada,
            cancelada
        };
    }
}

module.exports = new InspectionService();
