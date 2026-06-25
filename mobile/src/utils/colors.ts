// Colores compartidos - CURIEL Mobile
// Default light colors (legacy compatibility)
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

// Dark mode status colors (brighter for dark backgrounds)
export const DARK_STATUS_COLORS = {
    pendiente: '#ffa726',
    en_proceso: '#42a5f5',
    lista_revision: '#ab47bc',
    finalizada: '#66bb6a',
    cancelada: '#ef5350',
    reprogramada: '#26c6da',
};

export const getStatusThemeColor = (status, isDark = false) => {
    if (!isDark) return STATUS_COLORS[status] || COLORS.textLight;
    return DARK_STATUS_COLORS[status] || '#94a3b8';
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

export const DARK_SEVERITY_COLORS = {
    leve: '#66bb6a',
    media: '#ffa726',
    alta: '#ef5350',
    critica: '#ef5350',
};

export const OBSERVATION_TYPES = ['humedad', 'electrico', 'acabados', 'otro'];
export const SEVERITY_OPTIONS = ['leve', 'media', 'alta', 'critica'];

export const getStatusColor = (status) => STATUS_COLORS[status] || COLORS.textLight;
export const getSeverityColor = (severity, isDark = false) => {
    if (isDark) return DARK_SEVERITY_COLORS[severity] || '#94a3b8';
    return SEVERITY_COLORS[severity] || COLORS.textLight;
};

export const getStatusLabel = (status) => {
    const labels = {
        pendiente: 'Pendiente',
        en_proceso: 'En proceso',
        lista_revision: 'Lista para revisión',
        finalizada: 'Finalizada',
        cancelada: 'Cancelada',
        reprogramada: 'Reprogramada',
    };
    return labels[status] || status;
};
