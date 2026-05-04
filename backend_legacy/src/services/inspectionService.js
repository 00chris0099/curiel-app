const { Inspection, User, Role, InspectionResponse, ChecklistItem, Photo, ChecklistTemplate, InspectionStatusHistory } = require('../models');
const { AppError } = require('../middlewares/errorHandler');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const { triggerN8nWebhook } = require('../utils/n8n');

const safeUserAttributes = {
    exclude: ['passwordHash', '_plainPassword']
};

const inspectionStatuses = ['pendiente', 'en_proceso', 'lista_revision', 'finalizada', 'cancelada', 'reprogramada'];

const cancellationReasons = {
    cliente_reprogramo: 'Cliente reprogramó la visita',
    cliente_no_responde: 'Cliente no responde',
    cliente_cancelo_servicio: 'Cliente canceló el servicio',
    inspector_no_disponible: 'Inspector no disponible',
    direccion_incorrecta: 'Dirección incorrecta',
    pago_no_confirmado: 'Pago no confirmado',
    acceso_no_autorizado: 'Acceso no autorizado',
    problema_interno: 'Problema interno',
    otro: 'Otro'
};

const rescheduleReasons = {
    cliente_solicito_cambio: 'Cliente solicitó cambio',
    inspector_solicito_cambio: 'Inspector solicitó cambio',
    falta_acceso: 'Falta acceso al inmueble',
    emergencia: 'Emergencia',
    conflicto_horario: 'Conflicto horario',
    otro: 'Otro'
};

const correctionReasons = {
    faltan_fotos: 'Faltan fotos',
    faltan_observaciones: 'Faltan observaciones',
    mediciones_incompletas: 'Mediciones incompletas',
    recomendaciones_insuficientes: 'Recomendaciones insuficientes',
    error_datos_inmueble: 'Error en datos del inmueble',
    informe_poco_claro: 'Informe poco claro',
    otro: 'Otro'
};

const statusReasonCatalog = {
    cancelada: cancellationReasons,
    reprogramada: rescheduleReasons,
    correction_return: correctionReasons
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
                },
                {
                    model: InspectionStatusHistory,
                    as: 'statusHistory',
                    include: [
                        {
                            model: User,
                            as: 'changedByUser',
                            attributes: safeUserAttributes
                        }
                    ]
                }
            ],
            order: [[{ model: InspectionStatusHistory, as: 'statusHistory' }, 'createdAt', 'DESC']]
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
        if (['finalizada', 'cancelada'].includes(inspection.status)) {
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
    async updateInspectionStatus(inspectionId, statusData, userId, userRole, isMasterAdmin = false) {
        const {
            status: newStatus,
            reasonCode,
            reasonLabel,
            comment,
            notifyClient = false,
            notifyInspector = false,
            scheduledDate
        } = statusData;

        const inspection = await Inspection.findByPk(inspectionId, {
            include: [
                {
                    model: User,
                    as: 'inspector',
                    attributes: safeUserAttributes
                }
            ]
        });

        if (!inspection) {
            throw new AppError('Inspección no encontrada', 404, 'INSPECTION_NOT_FOUND');
        }

        if (!inspectionStatuses.includes(newStatus)) {
            throw new AppError('Estado inválido', 400, 'INVALID_STATUS');
        }

        if (!isMasterAdmin && userRole === 'inspector' && inspection.inspectorId !== userId) {
            throw new AppError('No tienes permisos para cambiar el estado', 403, 'FORBIDDEN');
        }

        if (inspection.status === newStatus) {
            throw new AppError('La inspección ya se encuentra en ese estado', 400, 'STATUS_UNCHANGED');
        }

        if (['finalizada', 'cancelada'].includes(inspection.status)) {
            throw new AppError('No se puede cambiar el estado de una inspección finalizada o cancelada', 400, 'STATUS_LOCKED');
        }

        const oldStatus = inspection.status;
        this._assertAllowedStatusTransition(oldStatus, newStatus, userRole, isMasterAdmin);

        const resolvedReasonLabel = this._resolveReasonLabel(oldStatus, newStatus, reasonCode, reasonLabel);
        this._validateStatusTransitionPayload(oldStatus, newStatus, {
            reasonCode,
            comment,
            scheduledDate,
            reasonLabel: resolvedReasonLabel
        });

        const normalizedComment = comment?.trim() || null;
        const nextScheduledDate = scheduledDate ? new Date(scheduledDate) : null;

        if (newStatus === 'reprogramada' && nextScheduledDate) {
            inspection.scheduledDate = nextScheduledDate;
        }

        inspection.status = newStatus;

        if (newStatus === 'finalizada') {
            inspection.completedDate = new Date();
        } else if (['pendiente', 'en_proceso', 'lista_revision', 'reprogramada'].includes(newStatus)) {
            inspection.completedDate = null;
        }

        let history;
        await sequelize.transaction(async (transaction) => {
            await inspection.save({ transaction });

            history = await InspectionStatusHistory.create({
                inspectionId,
                changedByUserId: userId,
                fromStatus: oldStatus,
                toStatus: newStatus,
                reasonCode: reasonCode || null,
                reasonLabel: resolvedReasonLabel,
                comment: normalizedComment,
                notifyClient: Boolean(notifyClient),
                notifyInspector: Boolean(notifyInspector)
            }, { transaction });
        });

        await inspection.reload({
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
                    model: InspectionStatusHistory,
                    as: 'statusHistory',
                    include: [
                        {
                            model: User,
                            as: 'changedByUser',
                            attributes: safeUserAttributes
                        }
                    ]
                }
            ],
            order: [[{ model: InspectionStatusHistory, as: 'statusHistory' }, 'createdAt', 'DESC']]
        });

        await this._triggerStatusNotifications({
            inspection,
            history,
            notifyClient: Boolean(notifyClient),
            notifyInspector: Boolean(notifyInspector),
            userRole
        });

        return {
            inspection,
            oldStatus,
            newStatus,
            history
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
        const listaRevision = await Inspection.count({ where: { ...where, status: 'lista_revision' } });
        const finalizada = await Inspection.count({ where: { ...where, status: 'finalizada' } });
        const cancelada = await Inspection.count({ where: { ...where, status: 'cancelada' } });
        const reprogramada = await Inspection.count({ where: { ...where, status: 'reprogramada' } });

        return {
            total,
            pendiente,
            en_proceso: enProceso,
            lista_revision: listaRevision,
            finalizada,
            cancelada,
            reprogramada
        };
    }

    _assertAllowedStatusTransition(fromStatus, toStatus, userRole, isMasterAdmin) {
        if (isMasterAdmin) {
            return;
        }

        if (userRole === 'inspector') {
            const allowedInspectorTransitions = {
                pendiente: ['en_proceso'],
                en_proceso: ['lista_revision']
            };

            if (!(allowedInspectorTransitions[fromStatus] || []).includes(toStatus)) {
                throw new AppError('No tienes permisos para realizar esta transición de estado', 403, 'FORBIDDEN_STATUS_TRANSITION');
            }

            return;
        }

        if (!['admin', 'arquitecto'].includes(userRole)) {
            throw new AppError('No tienes permisos para cambiar el estado de esta inspección', 403, 'FORBIDDEN_STATUS_TRANSITION');
        }

        const allowedTransitions = {
            pendiente: ['en_proceso', 'cancelada', 'reprogramada'],
            en_proceso: ['lista_revision', 'cancelada', 'reprogramada', 'finalizada'],
            lista_revision: ['en_proceso', 'cancelada', 'reprogramada', 'finalizada'],
            reprogramada: ['pendiente', 'en_proceso', 'cancelada', 'lista_revision', 'finalizada']
        };

        if (!(allowedTransitions[fromStatus] || []).includes(toStatus)) {
            throw new AppError('La transición de estado no está permitida para tu rol', 403, 'FORBIDDEN_STATUS_TRANSITION');
        }
    }

    _resolveReasonLabel(fromStatus, toStatus, reasonCode, customReasonLabel) {
        if (!reasonCode) {
            return null;
        }

        if (customReasonLabel?.trim()) {
            return customReasonLabel.trim();
        }

        if (toStatus === 'en_proceso' && fromStatus === 'lista_revision') {
            return statusReasonCatalog.correction_return[reasonCode] || null;
        }

        return statusReasonCatalog[toStatus]?.[reasonCode] || null;
    }

    _validateStatusTransitionPayload(fromStatus, toStatus, payload) {
        const requiresReason = toStatus === 'cancelada'
            || toStatus === 'reprogramada'
            || (toStatus === 'en_proceso' && fromStatus === 'lista_revision');

        if (requiresReason && !payload.reasonCode) {
            throw new AppError('Debes seleccionar un motivo para este cambio de estado', 422, 'MISSING_REASON_CODE');
        }

        if (toStatus === 'cancelada' && payload.reasonCode && !cancellationReasons[payload.reasonCode]) {
            throw new AppError('Motivo de cancelación inválido', 422, 'INVALID_REASON_CODE');
        }

        if (toStatus === 'reprogramada') {
            if (!rescheduleReasons[payload.reasonCode]) {
                throw new AppError('Motivo de reprogramación inválido', 422, 'INVALID_REASON_CODE');
            }

            if (!payload.scheduledDate) {
                throw new AppError('Debes indicar la nueva fecha y hora al reprogramar', 422, 'MISSING_SCHEDULED_DATE');
            }
        }

        if (toStatus === 'en_proceso' && fromStatus === 'lista_revision' && !correctionReasons[payload.reasonCode]) {
            throw new AppError('Motivo de devolución inválido', 422, 'INVALID_REASON_CODE');
        }
    }

    async _triggerStatusNotifications({ inspection, history, notifyClient, notifyInspector }) {
        const shouldNotifyInspector = notifyInspector
            || history.toStatus === 'reprogramada'
            || (history.fromStatus === 'lista_revision' && history.toStatus === 'en_proceso')
            || history.toStatus === 'finalizada';

        if (shouldNotifyInspector && inspection.inspector) {
            await triggerN8nWebhook('userNotification', {
                channel: 'internal',
                type: 'inspection_status_changed',
                inspectionId: inspection.id,
                inspectionStatus: history.toStatus,
                recipient: {
                    id: inspection.inspector.id,
                    email: inspection.inspector.email,
                    fullName: inspection.inspector.fullName
                },
                reasonCode: history.reasonCode,
                reasonLabel: history.reasonLabel,
                comment: history.comment,
                notifyClient: Boolean(notifyClient)
            });
        }
    }
}

module.exports = new InspectionService();
