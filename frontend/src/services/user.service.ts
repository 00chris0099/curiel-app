import apiClient, { N8N_ENDPOINTS } from '../api/axios';
import type { User } from '../types';

export interface UsersListResponse {
    success: boolean;
    data: User[];
    meta?: {
        total: number;
        page: number;
        limit: number;
    };
}

// ============================================
// Servicio de usuarios → Webhook n8n
// ============================================
const isN8nConfigured = (): boolean => {
    const url = import.meta.env.VITE_API_URL || '';
    return url.length > 0 && !url.includes('tu-n8n.com');
};

const userService = {

    /**
     * Obtener lista de inspectores activos
     */
    async getInspectors(): Promise<User[]> {
        if (!isN8nConfigured()) {
            throw new Error('n8n no está configurado. Configura VITE_API_URL para usar el servicio de usuarios.');
        }

        const response = await apiClient.post<UsersListResponse>(
            N8N_ENDPOINTS.inspection,
            { action: 'getInspectors', role: 'inspector', isActive: true }
        );
        return response.data.data ?? [];
    },

    /**
     * Obtener todos los usuarios
     */
    async getAllUsers(): Promise<User[]> {
        if (!isN8nConfigured()) {
            throw new Error('n8n no está configurado. Configura VITE_API_URL para usar el servicio de usuarios.');
        }

        const response = await apiClient.post<UsersListResponse>(
            N8N_ENDPOINTS.inspection,
            { action: 'getAllUsers' }
        );
        return response.data.data ?? [];
    },
};

export default userService;
