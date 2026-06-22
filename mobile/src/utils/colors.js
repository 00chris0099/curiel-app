// Colores compartidos - CURIEL Mobile
export const COLORS = {
    primary: '#1a237e',
    primaryLight: '#e8eaf6',
    error: '#f44336',
    success: '#4caf50',
    warning: '#ff9800',
    info: '#2196f3',
    text: '#333',
    textMuted: '#666',
    textLight: '#999',
    border: '#ddd',
    borderLight: '#f0f0f0',
    bg: '#f5f5f5',
    white: '#fff',
};

export const STATUS_COLORS = {
    pendiente: '#ff9800',
    en_proceso: '#2196f3',
    lista_revision: '#9c27b0',
    finalizada: '#4caf50',
    cancelada: '#f44336',
    reprogramada: '#00bcd4',
};

export const SEVERITY_COLORS = {
    leve: '#4caf50',
    media: '#ff9800',
    alta: '#f44336',
    critica: '#b71c1c',
};

export const OBSERVATION_TYPES = ['humedad', 'electrico', 'acabados', 'otro'];
export const SEVERITY_OPTIONS = ['leve', 'media', 'alta', 'critica'];

export const getStatusColor = (status) => STATUS_COLORS[status] || COLORS.textLight;
export const getSeverityColor = (severity) => SEVERITY_COLORS[severity] || COLORS.textLight;

export const getStatusLabel = (status) => {
    const labels = {
        pendiente: 'Pendiente',
        en_proceso: 'En Proceso',
        lista_revision: 'Lista Revision',
        finalizada: 'Finalizada',
        cancelada: 'Cancelada',
        reprogramada: 'Reprogramada',
    };
    return labels[status] || status;
};
