import type { Inspection, InspectionStatus, UpdateInspectionStatusDto, User } from '../types';

export type StatusReasonOption = {
    code: string;
    label: string;
};

export type StatusActionConfig = {
    status: InspectionStatus;
    label: string;
    description: string;
    primary?: boolean;
    requiresReason?: boolean;
    requiresSchedule?: boolean;
    recommendComment?: boolean;
    defaultNotifyClient?: boolean;
    defaultNotifyInspector?: boolean;
    confirmLabel: string;
};

export const inspectionStatusLabels: Record<InspectionStatus, string> = {
    pendiente: 'Pendiente',
    en_proceso: 'En proceso',
    lista_revision: 'Lista para revisión',
    finalizada: 'Finalizada',
    cancelada: 'Cancelada',
    reprogramada: 'Reprogramada',
};

export const inspectionStatusBadgeClasses: Record<InspectionStatus, string> = {
    pendiente: 'badge-warning',
    en_proceso: 'badge-info',
    lista_revision: 'badge-info',
    finalizada: 'badge-success',
    cancelada: 'badge-danger',
    reprogramada: 'badge-warning',
};

export const cancellationReasonOptions: StatusReasonOption[] = [
    { code: 'cliente_reprogramo', label: 'Cliente reprogramó la visita' },
    { code: 'cliente_no_responde', label: 'Cliente no responde' },
    { code: 'cliente_cancelo_servicio', label: 'Cliente canceló el servicio' },
    { code: 'inspector_no_disponible', label: 'Inspector no disponible' },
    { code: 'direccion_incorrecta', label: 'Dirección incorrecta' },
    { code: 'pago_no_confirmado', label: 'Pago no confirmado' },
    { code: 'acceso_no_autorizado', label: 'Acceso no autorizado' },
    { code: 'problema_interno', label: 'Problema interno' },
    { code: 'otro', label: 'Otro' },
];

export const rescheduleReasonOptions: StatusReasonOption[] = [
    { code: 'cliente_solicito_cambio', label: 'Cliente solicitó cambio' },
    { code: 'inspector_solicito_cambio', label: 'Inspector solicitó cambio' },
    { code: 'falta_acceso', label: 'Falta acceso al inmueble' },
    { code: 'emergencia', label: 'Emergencia' },
    { code: 'conflicto_horario', label: 'Conflicto horario' },
    { code: 'otro', label: 'Otro' },
];

export const correctionReasonOptions: StatusReasonOption[] = [
    { code: 'faltan_fotos', label: 'Faltan fotos' },
    { code: 'faltan_observaciones', label: 'Faltan observaciones' },
    { code: 'mediciones_incompletas', label: 'Mediciones incompletas' },
    { code: 'recomendaciones_insuficientes', label: 'Recomendaciones insuficientes' },
    { code: 'error_datos_inmueble', label: 'Error en datos del inmueble' },
    { code: 'informe_poco_claro', label: 'Informe poco claro' },
    { code: 'otro', label: 'Otro' },
];

const inspectorActionsByStatus: Partial<Record<InspectionStatus, StatusActionConfig[]>> = {
    pendiente: [
        {
            status: 'en_proceso',
            label: 'Iniciar inspección',
            description: 'Marca la visita como iniciada en campo.',
            confirmLabel: 'Cambiar a en proceso',
        }
    ],
    en_proceso: [
        {
            status: 'lista_revision',
            label: 'Enviar a revisión',
            description: 'Envía el informe técnico para revisión del arquitecto o admin.',
            defaultNotifyInspector: false,
            defaultNotifyClient: false,
            confirmLabel: 'Enviar a revisión',
        }
    ]
};

const reviewerActionsByStatus: Partial<Record<InspectionStatus, StatusActionConfig[]>> = {
    pendiente: [
        {
            status: 'en_proceso',
            label: 'Marcar en proceso',
            description: 'Marca la inspección como iniciada.',
            confirmLabel: 'Cambiar a en proceso',
        },
        {
            status: 'cancelada',
            label: 'Cancelar inspección',
            description: 'Cancela la inspección y registra un motivo.',
            requiresReason: true,
            defaultNotifyInspector: true,
            confirmLabel: 'Confirmar cancelación',
        },
        {
            status: 'reprogramada',
            label: 'Reprogramar visita',
            description: 'Cambia la fecha y registra el motivo del cambio.',
            requiresReason: true,
            requiresSchedule: true,
            defaultNotifyClient: true,
            defaultNotifyInspector: true,
            confirmLabel: 'Confirmar reprogramación',
        }
    ],
    en_proceso: [
        {
            status: 'lista_revision',
            label: 'Enviar a revisión',
            description: 'Marca la inspección como lista para revisión.',
            confirmLabel: 'Enviar a revisión',
        },
        {
            status: 'finalizada',
            label: 'Finalizar inspección',
            description: 'Aprueba y cierra la inspección con comentario opcional.',
            defaultNotifyInspector: true,
            confirmLabel: 'Finalizar inspección',
        },
        {
            status: 'cancelada',
            label: 'Cancelar inspección',
            description: 'Cancela la inspección y registra un motivo.',
            requiresReason: true,
            defaultNotifyInspector: true,
            confirmLabel: 'Confirmar cancelación',
        },
        {
            status: 'reprogramada',
            label: 'Reprogramar visita',
            description: 'Programa una nueva fecha y hora.',
            requiresReason: true,
            requiresSchedule: true,
            defaultNotifyClient: true,
            defaultNotifyInspector: true,
            confirmLabel: 'Confirmar reprogramación',
        },
    ],
    lista_revision: [
        {
            status: 'en_proceso',
            label: 'Devolver a corrección',
            description: 'Devuelve la inspección al inspector indicando el motivo.',
            requiresReason: true,
            recommendComment: true,
            defaultNotifyInspector: true,
            confirmLabel: 'Devolver a corrección',
        },
        {
            status: 'finalizada',
            label: 'Aprobar y finalizar',
            description: 'Aprueba el informe final y cierra la inspección.',
            defaultNotifyInspector: true,
            confirmLabel: 'Finalizar inspección',
        },
        {
            status: 'cancelada',
            label: 'Cancelar inspección',
            description: 'Cancela la inspección y registra un motivo.',
            requiresReason: true,
            defaultNotifyInspector: true,
            confirmLabel: 'Confirmar cancelación',
        },
        {
            status: 'reprogramada',
            label: 'Reprogramar visita',
            description: 'Programa una nueva fecha y hora.',
            requiresReason: true,
            requiresSchedule: true,
            defaultNotifyClient: true,
            defaultNotifyInspector: true,
            confirmLabel: 'Confirmar reprogramación',
        },
    ],
    reprogramada: [
        {
            status: 'pendiente',
            label: 'Volver a pendiente',
            description: 'Deja la inspección lista para ser retomada.',
            confirmLabel: 'Marcar pendiente',
        },
        {
            status: 'cancelada',
            label: 'Cancelar inspección',
            description: 'Cancela la inspección y registra un motivo.',
            requiresReason: true,
            defaultNotifyInspector: true,
            confirmLabel: 'Confirmar cancelación',
        },
        {
            status: 'en_proceso',
            label: 'Marcar en proceso',
            description: 'Reanuda la inspección con la nueva programación.',
            confirmLabel: 'Marcar en proceso',
        },
    ]
};

export const getStatusReasonOptions = (fromStatus: InspectionStatus, toStatus: InspectionStatus) => {
    if (toStatus === 'cancelada') {
        return cancellationReasonOptions;
    }

    if (toStatus === 'reprogramada') {
        return rescheduleReasonOptions;
    }

    if (toStatus === 'en_proceso' && fromStatus === 'lista_revision') {
        return correctionReasonOptions;
    }

    return [];
};

export const getAllowedStatusActions = (inspection: Inspection, user: User | null) => {
    if (!user) {
        return [];
    }

    if (['finalizada', 'cancelada'].includes(inspection.status)) {
        return [];
    }

    if (user.isMasterAdmin || user.role === 'admin' || user.role === 'arquitecto') {
        return reviewerActionsByStatus[inspection.status] || [];
    }

    if (user.role === 'inspector' && user.id === inspection.inspectorId) {
        return inspectorActionsByStatus[inspection.status] || [];
    }

    return [];
};

export const buildStatusUpdatePayload = (
    base: UpdateInspectionStatusDto,
    fromStatus: InspectionStatus,
    toStatus: InspectionStatus
) => {
    const selectedReason = getStatusReasonOptions(fromStatus, toStatus).find((item) => item.code === base.reasonCode);

    return {
        ...base,
        reasonLabel: selectedReason?.label || base.reasonLabel,
    };
};
