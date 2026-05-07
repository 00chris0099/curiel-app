import type { CustomIconName } from '../components/CustomIcon';

export const inspectionStatusIconMap: Record<string, CustomIconName> = {
    pendiente: 'pause',
    en_proceso: 'play',
    lista_revision: 'undo',
    finalizada: 'seal-check',
    cancelada: 'x-circle',
    reprogramada: 'calendar',
};

export const areaStatusIconMap: Record<string, CustomIconName> = {
    pendiente: 'pause',
    en_revision: 'clock',
    observado: 'warning',
    aprobado: 'check-circle',
};

export const reportStatusIconMap: Record<string, CustomIconName> = {
    borrador: 'note-pencil',
    listo_para_revision: 'printer',
    aprobado: 'seal-check',
};

export const roleIconMap: Record<string, CustomIconName> = {
    admin: 'settings',
    arquitecto: 'buildings',
    inspector: 'clipboard-check',
};

export const observationSeverityIconMap: Record<string, CustomIconName> = {
    leve: 'check-circle',
    media: 'note-pencil',
    alta: 'warning',
    critica: 'warning-circle',
};

export const photoTypeIconMap: Record<string, CustomIconName> = {
    edificio: 'buildings',
    plano: 'image',
    area: 'camera',
    observacion: 'warning',
    general: 'camera',
};

export const getAreaCategoryIcon = (category?: string, areaName?: string): CustomIconName => {
    const value = `${category ?? ''} ${areaName ?? ''}`.toLowerCase();

    if (value.includes('baño')) return 'bath';
    if (value.includes('dormitorio') || value.includes('estudio')) return 'bed';
    if (value.includes('cocina') || value.includes('kitchen')) return 'utensils';
    if (value.includes('sala') || value.includes('comedor') || value.includes('social')) return 'sofa';
    if (value.includes('puerta') || value.includes('entrada')) return 'door';
    if (value.includes('estructura') || value.includes('acabados') || value.includes('servicio')) return 'wrench';
    if (value.includes('balc') || value.includes('terraza') || value.includes('exterior')) return 'house';

    return 'rooms';
};

export const getReviewPointIcon = (label: string): CustomIconName => {
    const value = label.toLowerCase();

    if (value.includes('humedad') || value.includes('filtraciones') || value.includes('grietas') || value.includes('fisuras')) return 'warning';
    if (value.includes('eléctricas') || value.includes('electricas')) return 'wrench';
    if (value.includes('sanitarias')) return 'bath';
    if (value.includes('pisos') || value.includes('acabados')) return 'ruler';
    if (value.includes('puertas') || value.includes('ventanas')) return 'door';
    if (value.includes('cocina')) return 'utensils';
    if (value.includes('baños') || value.includes('banos')) return 'bath';
    if (value.includes('balc') || value.includes('terraza')) return 'house';

    return 'note-pencil';
};
