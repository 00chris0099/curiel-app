const { prisma } = require('../lib/databases');
const { AppError } = require('../middlewares/errorHandler');
const { triggerN8nWebhook } = require('../utils/n8n');
const notificationService = require('./notificationService');

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

class InspectionService {
    async getAllInspections(filters = {}, userId, userRole, isMasterAdmin = false) {
        const { status, inspectorId, startDate, endDate, search, page = 1, limit = 10 } = filters;

        const where = {};

        if (!isMasterAdmin && userRole === 'inspector') {
            where.inspectorId = userId;
        }

        if (status) where.status = status;
        if (inspectorId && (userRole !== 'inspector' || isMasterAdmin)) where.inspectorId = inspectorId;

        if (startDate && endDate) {
            where.scheduledDate = { gte: new Date(startDate), lte: new Date(endDate) };
        }

        if (search) {
            where.OR = [
                { projectName: { contains: search, mode: 'insensitive' } },
                { clientName: { contains: search, mode: 'insensitive' } },
                { address: { contains: search, mode: 'insensitive' } }
            ];
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [inspections, total] = await Promise.all([
            prisma.inspecciones.inspection.findMany({
                where,
                take: parseInt(limit),
                skip,
                orderBy: { scheduledDate: 'desc' }
            }),
            prisma.inspecciones.inspection.count({ where })
        ]);

        return {
            inspections,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    async getInspectionById(inspectionId, userId, userRole, isMasterAdmin = false) {
        const inspection = await prisma.inspecciones.inspection.findUnique({
            where: { id: inspectionId },
            include: {
                statusHistory: { orderBy: { createdAt: 'desc' } },
                areas: {
                    include: {
                        observations: true
                    },
                    orderBy: { sortOrder: 'asc' }
                },
                summary: true,
                responses: true
            }
        });

        if (!inspection) {
            throw new AppError('Inspección no encontrada', 404, 'INSPECTION_NOT_FOUND');
        }

        if (!isMasterAdmin && userRole === 'inspector' && inspection.inspectorId !== userId) {
            throw new AppError('No tienes permisos para ver esta inspección', 403, 'FORBIDDEN');
        }

        return inspection;
    }

    async createInspection(inspectionData, creatorId) {
        const {
            projectName, clientName, clientEmail, clientPhone,
            address, city, state, zipCode, inspectionType,
            scheduledDate, inspectorId, notes, latitude, longitude
        } = inspectionData;

        const inspector = await prisma.auth.user.findUnique({
            where: { id: inspectorId },
            select: {
                id: true,
                roles: { select: { role: { select: { name: true } } } }
            }
        });

        if (!inspector) {
            throw new AppError('Inspector no encontrado', 404, 'INSPECTOR_NOT_FOUND');
        }

        const inspectorRoles = inspector.roles.map(r => r.role.name);
        if (!inspectorRoles.includes('inspector') && !inspectorRoles.includes('arquitecto')) {
            throw new AppError('El usuario asignado no es inspector ni arquitecto', 400, 'INVALID_INSPECTOR');
        }

        const inspection = await prisma.inspecciones.inspection.create({
            data: {
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
            }
        });

        const district = state || city || 'Lima';
        await notificationService.createForUser(inspectorId, {
            inspectionId: inspection.id,
            type: 'inspection_assigned',
            title: 'Nueva inspección asignada',
            message: `Se te asignó la inspección del departamento ${projectName} en ${district}.`
        });

        return inspection;
    }

    async updateInspection(inspectionId, updateData, userId, userRole, isMasterAdmin = false) {
        const inspection = await prisma.inspecciones.inspection.findUnique({
            where: { id: inspectionId }
        });

        if (!inspection) {
            throw new AppError('Inspección no encontrada', 404, 'INSPECTION_NOT_FOUND');
        }

        if (!isMasterAdmin && !['admin', 'arquitecto'].includes(userRole)) {
            throw new AppError('No tienes permisos para editar esta inspección', 403, 'FORBIDDEN');
        }

        if (['finalizada', 'cancelada'].includes(inspection.status)) {
            throw new AppError('No se puede editar una inspección finalizada', 400, 'INSPECTION_COMPLETED');
        }

        const allowedFields = [
            'projectName', 'clientName', 'clientEmail', 'clientPhone',
            'address', 'city', 'state', 'zipCode', 'inspectionType',
            'scheduledDate', 'notes', 'latitude', 'longitude'
        ];

        const data = {};
        allowedFields.forEach(field => {
            if (updateData[field] !== undefined) {
                data[field] = updateData[field];
            }
        });

        if (updateData.inspectorId && (userRole === 'admin' || userRole === 'arquitecto' || isMasterAdmin)) {
            const inspector = await prisma.auth.user.findUnique({
                where: { id: updateData.inspectorId }
            });
            if (!inspector) {
                throw new AppError('Inspector no encontrado', 404, 'INSPECTOR_NOT_FOUND');
            }
            data.inspectorId = updateData.inspectorId;
        }

        return prisma.inspecciones.inspection.update({
            where: { id: inspectionId },
            data
        });
    }

    async updateInspectionStatus(inspectionId, statusData, userId, userRole, isMasterAdmin = false) {
        const {
            status: newStatus, reasonCode, reasonLabel, comment,
            notifyClient = false, notifyInspector = false, scheduledDate
        } = statusData;

        const inspection = await prisma.inspecciones.inspection.findUnique({
            where: { id: inspectionId },
            include: { statusHistory: { orderBy: { createdAt: 'desc' }, take: 1 } }
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
            reasonCode, comment, scheduledDate, reasonLabel: resolvedReasonLabel
        });

        const normalizedComment = comment?.trim() || null;
        const nextScheduledDate = scheduledDate ? new Date(scheduledDate) : null;

        const updateFields = { status: newStatus };
        if (newStatus === 'reprogramada' && nextScheduledDate) {
            updateFields.scheduledDate = nextScheduledDate;
        }
        if (newStatus === 'finalizada') {
            updateFields.completedDate = new Date();
        } else if (['pendiente', 'en_proceso', 'lista_revision', 'reprogramada'].includes(newStatus)) {
            updateFields.completedDate = null;
        }

        let history;
        await prisma.inspecciones.$transaction(async (tx) => {
            await tx.inspection.update({
                where: { id: inspectionId },
                data: updateFields
            });

            history = await tx.inspectionStatusHistory.create({
                data: {
                    inspectionId,
                    changedByUserId: userId,
                    fromStatus: oldStatus,
                    toStatus: newStatus,
                    reasonCode: reasonCode || null,
                    reasonLabel: resolvedReasonLabel,
                    comment: normalizedComment,
                    notifyClient: Boolean(notifyClient),
                    notifyInspector: Boolean(notifyInspector)
                }
            });
        });

        const updatedInspection = await prisma.inspecciones.inspection.findUnique({
            where: { id: inspectionId },
            include: {
                statusHistory: { orderBy: { createdAt: 'desc' } }
            }
        });

        await this._triggerStatusNotifications({
            inspection: updatedInspection, history, notifyClient: Boolean(notifyClient),
            notifyInspector: Boolean(notifyInspector), userRole
        });

        await this._createStatusNotifications({
            inspection: updatedInspection, history, notifyInspector: Boolean(notifyInspector)
        });

        return { inspection: updatedInspection, oldStatus, newStatus, history };
    }

    async deleteInspection(inspectionId) {
        const inspection = await prisma.inspecciones.inspection.findUnique({
            where: { id: inspectionId }
        });

        if (!inspection) {
            throw new AppError('Inspección no encontrada', 404, 'INSPECTION_NOT_FOUND');
        }

        if (inspection.status === 'finalizada') {
            throw new AppError('No se puede eliminar una inspección finalizada', 400, 'CANNOT_DELETE_COMPLETED');
        }

        await prisma.inspecciones.inspection.delete({ where: { id: inspectionId } });

        return inspection;
    }

    async getInspectionStats(userId, userRole, isMasterAdmin = false) {
        const baseWhere = {};
        if (!isMasterAdmin && userRole === 'inspector') {
            baseWhere.inspectorId = userId;
        }

        const [total, pendiente, enProceso, listaRevision, finalizada, cancelada, reprogramada] = await Promise.all([
            prisma.inspecciones.inspection.count({ where: baseWhere }),
            prisma.inspecciones.inspection.count({ where: { ...baseWhere, status: 'pendiente' } }),
            prisma.inspecciones.inspection.count({ where: { ...baseWhere, status: 'en_proceso' } }),
            prisma.inspecciones.inspection.count({ where: { ...baseWhere, status: 'lista_revision' } }),
            prisma.inspecciones.inspection.count({ where: { ...baseWhere, status: 'finalizada' } }),
            prisma.inspecciones.inspection.count({ where: { ...baseWhere, status: 'cancelada' } }),
            prisma.inspecciones.inspection.count({ where: { ...baseWhere, status: 'reprogramada' } })
        ]);

        return { total, pendiente, en_proceso: enProceso, lista_revision: listaRevision, finalizada, cancelada, reprogramada };
    }

    _assertAllowedStatusTransition(fromStatus, toStatus, userRole, isMasterAdmin) {
        if (isMasterAdmin) return;

        if (userRole === 'inspector') {
            const allowed = { pendiente: ['en_proceso'], en_proceso: ['lista_revision'] };
            if (!(allowed[fromStatus] || []).includes(toStatus)) {
                throw new AppError('No tienes permisos para realizar esta transición de estado', 403, 'FORBIDDEN_STATUS_TRANSITION');
            }
            return;
        }

        if (!['admin', 'arquitecto', 'supervisor'].includes(userRole)) {
            throw new AppError('No tienes permisos para cambiar el estado de esta inspección', 403, 'FORBIDDEN_STATUS_TRANSITION');
        }

        const allowed = {
            pendiente: ['en_proceso', 'cancelada', 'reprogramada'],
            en_proceso: ['lista_revision', 'cancelada', 'reprogramada', 'finalizada'],
            lista_revision: ['en_proceso', 'cancelada', 'reprogramada', 'finalizada'],
            reprogramada: ['pendiente', 'en_proceso', 'cancelada', 'lista_revision', 'finalizada']
        };

        if (!(allowed[fromStatus] || []).includes(toStatus)) {
            throw new AppError('La transición de estado no está permitida para tu rol', 403, 'FORBIDDEN_STATUS_TRANSITION');
        }

        if (userRole === 'supervisor' && toStatus === 'finalizada') {
            throw new AppError('El supervisor no puede finalizar inspecciones', 403, 'SUPERVISOR_CANNOT_FINALIZE');
        }
    }

    _resolveReasonLabel(fromStatus, toStatus, reasonCode, customReasonLabel) {
        if (!reasonCode) return null;
        if (customReasonLabel?.trim()) return customReasonLabel.trim();
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

        if (shouldNotifyInspector && inspection.inspectorId) {
            const inspector = await prisma.auth.user.findUnique({
                where: { id: inspection.inspectorId },
                select: { id: true, email: true, fullName: true }
            });

            if (inspector) {
                await triggerN8nWebhook('userNotification', {
                    channel: 'internal',
                    type: 'inspection_status_changed',
                    inspectionId: inspection.id,
                    inspectionStatus: history.toStatus,
                    recipient: {
                        id: inspector.id,
                        email: inspector.email,
                        fullName: inspector.fullName
                    },
                    reasonCode: history.reasonCode,
                    reasonLabel: history.reasonLabel,
                    comment: history.comment,
                    notifyClient: Boolean(notifyClient)
                });
            }
        }
    }

    async _createStatusNotifications({ inspection, history, notifyInspector }) {
        const district = inspection.state || inspection.city || 'Lima';
        const inspectionLabel = inspection.projectName || 'inspección';

        if (history.fromStatus === 'pendiente' && history.toStatus === 'en_proceso') {
            await notificationService.createForRoles(['admin', 'arquitecto'], {
                inspectionId: inspection.id,
                type: 'inspection_started',
                title: 'Inspección iniciada',
                message: `El inspector inició la inspección del departamento ${inspectionLabel} en ${district}.`
            }, [inspection.inspectorId]);
        }

        if (history.toStatus === 'lista_revision') {
            await notificationService.createForRoles(['admin', 'arquitecto'], {
                inspectionId: inspection.id,
                type: 'inspection_ready_for_review',
                title: 'Inspección lista para revisión',
                message: `El informe de la inspección ${inspectionLabel} está listo para revisión.`
            }, [inspection.inspectorId]);
        }

        if (history.toStatus === 'cancelada' && notifyInspector && inspection.inspectorId) {
            await notificationService.createForUser(inspection.inspectorId, {
                inspectionId: inspection.id,
                type: 'inspection_cancelled',
                title: 'Inspección cancelada',
                message: history.reasonLabel
                    ? `La inspección ${inspectionLabel} fue cancelada. Motivo: ${history.reasonLabel}.`
                    : `La inspección ${inspectionLabel} fue cancelada.`
            });
        }

        if (history.toStatus === 'reprogramada' && inspection.inspectorId) {
            await notificationService.createForUser(inspection.inspectorId, {
                inspectionId: inspection.id,
                type: 'inspection_rescheduled',
                title: 'Inspección reprogramada',
                message: `La inspección ${inspectionLabel} fue reprogramada${history.reasonLabel ? `: ${history.reasonLabel}` : ''}.`
            });
        }

        if (history.fromStatus === 'lista_revision' && history.toStatus === 'en_proceso' && inspection.inspectorId) {
            await notificationService.createForUser(inspection.inspectorId, {
                inspectionId: inspection.id,
                type: 'inspection_returned_for_correction',
                title: 'Correcciones solicitadas',
                message: history.comment
                    ? `La inspección ${inspectionLabel} volvió a corrección. ${history.comment}`
                    : `La inspección ${inspectionLabel} volvió a corrección${history.reasonLabel ? `: ${history.reasonLabel}` : ''}.`
            });
        }

        if (history.toStatus === 'finalizada' && inspection.inspectorId) {
            await notificationService.createForUser(inspection.inspectorId, {
                inspectionId: inspection.id,
                type: 'inspection_finalized',
                title: 'Inspección finalizada',
                message: `El informe de la inspección ${inspectionLabel} fue aprobado.`
            });

            triggerN8nWebhook('inspectionCompleted', {
                event: 'inspection_finalized',
                inspection: {
                    id: inspection.id,
                    projectName: inspection.projectName,
                    clientName: inspection.clientName,
                    clientEmail: inspection.clientEmail,
                    inspectorId: inspection.inspectorId,
                    status: inspection.status
                }
            });
        }
    }
}

module.exports = new InspectionService();
