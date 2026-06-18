import apiClient from '../api/axios';
import type {
    Suspension,
    CreateSuspensionDto,
    ApiResponse,
    PaginatedResponse,
} from '../types';

const suspensionService = {
    async getAll(filters: { status?: string; inspectorId?: string; page?: number; limit?: number } = {}): Promise<PaginatedResponse<Suspension>> {
        const params = new URLSearchParams();
        if (filters.status) params.append('status', filters.status);
        if (filters.inspectorId) params.append('inspectorId', filters.inspectorId);
        if (filters.page) params.append('page', String(filters.page));
        if (filters.limit) params.append('limit', String(filters.limit));

        const response = await apiClient.get<PaginatedResponse<Suspension>>(
            `/suspensions?${params.toString()}`
        );
        return response.data;
    },

    async getById(id: string): Promise<ApiResponse<{ suspension: Suspension }>> {
        const response = await apiClient.get<ApiResponse<{ suspension: Suspension }>>(
            `/suspensions/${id}`
        );
        return response.data;
    },

    async create(data: CreateSuspensionDto): Promise<ApiResponse<{ suspension: Suspension }>> {
        const response = await apiClient.post<ApiResponse<{ suspension: Suspension }>>(
            '/suspensions',
            data
        );
        return response.data;
    },

    async lift(id: string): Promise<ApiResponse<{ suspension: Suspension }>> {
        const response = await apiClient.put<ApiResponse<{ suspension: Suspension }>>(
            `/suspensions/${id}/lift`
        );
        return response.data;
    },

    async getSuspendedInspectors(): Promise<ApiResponse<{ suspensions: Suspension[] }>> {
        const response = await apiClient.get<ApiResponse<{ suspensions: Suspension[] }>>(
            '/suspensions/suspended'
        );
        return response.data;
    },
};

export default suspensionService;
