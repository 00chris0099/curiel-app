import type {
    ExecutionAreaStatus,
    ExecutionPhotoType,
    ExecutionReportStatus,
    ObservationResolutionStatus,
    ObservationSeverity,
    ObservationType,
} from '../../types';

export const areaStatusOptions: ExecutionAreaStatus[] = ['pendiente', 'en_revision', 'observado', 'aprobado'];
export const observationSeverityOptions: ObservationSeverity[] = ['leve', 'media', 'alta', 'critica'];
export const observationTypeOptions: ObservationType[] = ['humedad', 'electrico', 'sanitario', 'acabados', 'carpinteria', 'estructura', 'seguridad', 'otro'];
export const observationStatusOptions: ObservationResolutionStatus[] = ['pendiente', 'corregido', 'requiere_revision'];
export const generalPhotoTypeOptions: ExecutionPhotoType[] = ['edificio', 'plano', 'general'];
export const areaPhotoTypeOptions: ExecutionPhotoType[] = ['area', 'observacion'];

export const defaultAreaDefinitions = [
    { name: 'Entrada', category: 'interior' },
    { name: 'Sala', category: 'social' },
    { name: 'Comedor', category: 'social' },
    { name: 'Kitchenette', category: 'cocina' },
    { name: 'Centro de lavado', category: 'servicio' },
    { name: 'Balcón', category: 'exterior' },
    { name: 'Estudio', category: 'privado' },
    { name: 'Dormitorio principal', category: 'privado' },
    { name: 'Dormitorio secundario', category: 'privado' },
    { name: 'Baño principal', category: 'baño' },
    { name: 'Baño 2', category: 'baño' },
    { name: 'Muros y vanos', category: 'estructura/acabados' },
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
