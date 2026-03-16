import apiClient, { N8N_ENDPOINTS } from '../api/axios';
import type {
    Inspection,
    InspectionStats,
    InspectionFilters,
    CreateInspectionDto,
    UpdateInspectionDto,
} from '../types';

// ============================================
// Tipos de respuesta del webhook n8n
// ============================================
export interface N8nInspectionListResponse {
    success: boolean;
    data: Inspection[];
    meta?: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

export interface N8nInspectionResponse {
    success: boolean;
    data: Inspection;
    message?: string;
}

export interface N8nStatsResponse {
    success: boolean;
    data: InspectionStats;
}

// ============================================
// Este servicio depende de n8n configurado.
// Si no se configura, lanzará un error para evitar datos de ejemplo.
// ============================================

// ============================================
// Helper: ¿n8n está configurado con URL real?
// ============================================
const isN8nConfigured = (): boolean => {
    const url = import.meta.env.VITE_API_URL || '';
    return url.length > 0 && !url.includes('tu-n8n.com');
};

// ============================================
// Servicio de inspecciones → Webhook n8n
// Si n8n no está configurado → devuelve datos demo
// ============================================
const inspectionService = {

    /**
     * Obtener lista de inspecciones con filtros opcionales
     */
    async getInspections(filters: InspectionFilters = {}): Promise<N8nInspectionListResponse> {
        if (!isN8nConfigured()) {
            throw new Error('n8n no está configurado. Configura VITE_API_URL para usar inspecciones.');
        }

        const response = await apiClient.post<N8nInspectionListResponse>(
            N8N_ENDPOINTS.inspection,
            { action: 'getInspections', filters }
        );
        return response.data;
    },

    /**
     * Obtener inspección por ID
     */
    async getInspectionById(id: string): Promise<Inspection> {
        if (!isN8nConfigured()) {
            throw new Error('n8n no está configurado. Configura VITE_API_URL para usar inspecciones.');
        }

        const response = await apiClient.post<N8nInspectionResponse>(
            N8N_ENDPOINTS.inspection,
            { action: 'getInspectionById', id }
        );
        return response.data.data;
    },

    /**
     * Crear nueva inspección
     */
    async createInspection(data: CreateInspectionDto): Promise<Inspection> {
        if (!isN8nConfigured()) {
            throw new Error('n8n no está configurado. Configura VITE_API_URL para crear inspecciones.');
        }

        const response = await apiClient.post<N8nInspectionResponse>(
            N8N_ENDPOINTS.inspection,
            { action: 'createInspection', ...data }
        );
        return response.data.data;
    },

    /**
     * Actualizar inspección por ID
     */
    async updateInspection(id: string, data: UpdateInspectionDto): Promise<Inspection> {
        if (!isN8nConfigured()) {
            throw new Error('n8n no está configurado. Configura VITE_API_URL para actualizar inspecciones.');
        }

        const response = await apiClient.post<N8nInspectionResponse>(
            N8N_ENDPOINTS.inspection,
            { action: 'updateInspection', id, ...data }
        );
        return response.data.data;
    },

    /**
     * Cambiar estado de una inspección
     */
    async updateStatus(id: string, status: Inspection['status']): Promise<Inspection> {
        if (!isN8nConfigured()) {
            return inspectionService.updateInspection(id, { status });
        }

        try {
            const response = await apiClient.post<N8nInspectionResponse>(
                N8N_ENDPOINTS.inspection,
                { action: 'updateStatus', id, status }
            );
            return response.data.data;
        } catch (error: any) {
            if (!error.response) {
                throw new Error('No se pudo cambiar el estado. Verifica tu conexión.');
            }
            throw error;
        }
    },

    /**
     * Eliminar inspección por ID
     */
    async deleteInspection(id: string): Promise<void> {
        if (!isN8nConfigured()) {
            throw new Error('n8n no está configurado. Configura VITE_API_URL para eliminar inspecciones.');
        }

        await apiClient.post(
            N8N_ENDPOINTS.inspection,
            { action: 'deleteInspection', id }
        );
    },

    /**
     * Obtener estadísticas del dashboard
     */
    async getStats(): Promise<InspectionStats> {
        if (!isN8nConfigured()) {
            throw new Error('n8n no está configurado. Configura VITE_API_URL para obtener estadísticas.');
        }

        const response = await apiClient.post<N8nStatsResponse>(
            N8N_ENDPOINTS.inspection,
            { action: 'getStats' }
        );
        return response.data.data;
    },
};

export default inspectionService;
