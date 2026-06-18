import apiClient from '../api/axios';
import type {
    Alert,
    CreateAlertDto,
    ApiResponse,
    PaginatedResponse,
} from '../types';

const alertService = {
    async getAll(filters: { status?: string; gravityLevel?: number; page?: number; limit?: number } = {}): Promise<PaginatedResponse<Alert>> {
        const params = new URLSearchParams();
        if (filters.status) params.append('status', filters.status);
        if (filters.gravityLevel) params.append('gravityLevel', String(filters.gravityLevel));
        if (filters.page) params.append('page', String(filters.page));
        if (filters.limit) params.append('limit', String(filters.limit));

        const response = await apiClient.get<PaginatedResponse<Alert>>(
            `/alerts?${params.toString()}`
        );
        return response.data;
    },

    async getById(id: string): Promise<ApiResponse<{ alert: Alert }>> {
        const response = await apiClient.get<ApiResponse<{ alert: Alert }>>(
            `/alerts/${id}`
        );
        return response.data;
    },

    async create(data: CreateAlertDto): Promise<ApiResponse<{ alert: Alert }>> {
        const response = await apiClient.post<ApiResponse<{ alert: Alert }>>(
            '/alerts',
            data
        );
        return response.data;
    },

    async update(id: string, data: { status?: string; gravityLevel?: number }): Promise<ApiResponse<{ alert: Alert }>> {
        const response = await apiClient.put<ApiResponse<{ alert: Alert }>>(
            `/alerts/${id}`,
            data
        );
        return response.data;
    },

    async getByGravityLevel(level: number): Promise<ApiResponse<{ alerts: Alert[] }>> {
        const response = await apiClient.get<ApiResponse<{ alerts: Alert[] }>>(
            `/alerts/level/${level}`
        );
        return response.data;
    },
};

export default alertService;
