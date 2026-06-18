import apiClient from '../api/axios';
import type {
    Client,
    CreateClientDto,
    UpdateClientDto,
    ClientFilters,
    Inspection,
    ApiResponse,
    PaginatedResponse,
} from '../types';

const clientService = {
    async getAll(filters: ClientFilters = {}): Promise<PaginatedResponse<Client>> {
        const params = new URLSearchParams();
        if (filters.search) params.append('search', filters.search);
        if (filters.documentType) params.append('documentType', filters.documentType);
        if (filters.page) params.append('page', String(filters.page));
        if (filters.limit) params.append('limit', String(filters.limit));

        const response = await apiClient.get<PaginatedResponse<Client>>(
            `/clients?${params.toString()}`
        );
        return response.data;
    },

    async getById(id: string): Promise<ApiResponse<{ client: Client }>> {
        const response = await apiClient.get<ApiResponse<{ client: Client }>>(
            `/clients/${id}`
        );
        return response.data;
    },

    async create(data: CreateClientDto): Promise<ApiResponse<{ client: Client }>> {
        const response = await apiClient.post<ApiResponse<{ client: Client }>>(
            '/clients',
            data
        );
        return response.data;
    },

    async update(id: string, data: UpdateClientDto): Promise<ApiResponse<{ client: Client }>> {
        const response = await apiClient.put<ApiResponse<{ client: Client }>>(
            `/clients/${id}`,
            data
        );
        return response.data;
    },

    async delete(id: string): Promise<ApiResponse<{ deleted: boolean; clientId: string }>> {
        const response = await apiClient.delete<ApiResponse<{ deleted: boolean; clientId: string }>>(
            `/clients/${id}`
        );
        return response.data;
    },

    async search(query: string): Promise<ApiResponse<{ clients: Client[] }>> {
        const response = await apiClient.get<ApiResponse<{ clients: Client[] }>>(
            `/clients/search?query=${encodeURIComponent(query)}`
        );
        return response.data;
    },

    async getInspections(
        id: string,
        filters: { status?: string; page?: number; limit?: number } = {}
    ): Promise<{ success: boolean; data: Inspection[]; pagination: { total: number; page: number; limit: number; totalPages: number } }> {
        const params = new URLSearchParams();
        if (filters.status) params.append('status', filters.status);
        if (filters.page) params.append('page', String(filters.page));
        if (filters.limit) params.append('limit', String(filters.limit));

        const response = await apiClient.get(
            `/clients/${id}/inspections?${params.toString()}`
        );
        return response.data;
    },
};

export default clientService;
