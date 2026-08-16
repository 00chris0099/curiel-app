import type {
    ExecutionAreaStatus,
    ExecutionPhotoType,
    ExecutionReportStatus,
    ObservationResolutionStatus,
    ObservationSeverity,
    ObservationType,
} from '../../types';

export const areaStatusOptions: ExecutionAreaStatus[] = ['pendiente', 'en_revision', 'observado', 'aprobado'];
export const areaCategoryOptions = ['interior', 'social', 'cocina', 'servicio', 'exterior', 'privado', 'baño', 'estructura/acabados'] as const;
export const observationSeverityOptions: ObservationSeverity[] = ['leve', 'media', 'alta', 'critica'];
export const observationTypeOptions: ObservationType[] = ['humedad', 'electrico', 'sanitario', 'acabados', 'carpinteria', 'estructura', 'seguridad', 'otro'];
export const observationStatusOptions: ObservationResolutionStatus[] = ['pendiente', 'corregido', 'requiere_revision'];
export const generalPhotoTypeOptions: ExecutionPhotoType[] = ['edificio', 'plano', 'general'];
export const areaPhotoTypeOptions: ExecutionPhotoType[] = ['area', 'observacion'];

export const defaultAreaDefinitions = [
    { name: 'BALCÓN', category: 'exterior' },
    { name: 'SALA Y COMEDOR', category: 'social' },
    { name: 'KITCHENETTE', category: 'cocina' },
    { name: 'CENTRO DE LAVADO', category: 'servicio' },
    { name: 'DORMITORIO PRINCIPAL', category: 'privado' },
    { name: 'BAÑO PRINCIPAL', category: 'baño' },
    { name: 'PASADIZO', category: 'interior' },
    { name: 'MUROS Y VANOS', category: 'estructura/acabados' },
    { name: 'DEPÓSITO Y ALMACÉN', category: 'servicio' },
];

export const areaStatusLabels: Record<ExecutionAreaStatus, string> = {
    pendiente: 'Pendiente',
    en_revision: 'En revisión',
    observado: 'Observado',
    aprobado: 'Aprobado',
};

export const areaStatusBadges: Record<ExecutionAreaStatus, string> = {
    pendiente: 'badge-warning',
    en_revision: 'badge-info',
    observado: 'badge-danger',
    aprobado: 'badge-success',
};

export const severityBadges: Record<ObservationSeverity, string> = {
    leve: 'badge-success',
    media: 'badge-info',
    alta: 'badge-warning',
    critica: 'badge-danger',
};

export const reportStatusLabels: Record<ExecutionReportStatus, string> = {
    borrador: 'Borrador',
    listo_para_revision: 'Listo para revisión',
    aprobado: 'Aprobado',
};

export const photoTypeLabels: Record<ExecutionPhotoType, string> = {
    edificio: 'Edificio',
    plano: 'Plano',
    area: 'Área',
    observacion: 'Observación',
    general: 'General',
};
