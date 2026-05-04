import apiClient from '../api/axios';
import type {
    Inspection,
    InspectionStats,
    InspectionFilters,
    CreateInspectionDto,
    UpdateInspectionDto,
    ApiResponse,
    PaginatedResponse,
} from '../types';

const inspectionService = {
    async getInspections(filters: InspectionFilters = {}): Promise<PaginatedResponse<Inspection>> {
        const response = await apiClient.get<PaginatedResponse<Inspection>>('/inspections', {
            params: filters,
        });
        return response.data;
    },

    async getInspectionById(id: string): Promise<Inspection> {
        const response = await apiClient.get<ApiResponse<Inspection>>(`/inspections/${id}`);
        if (!response.data.data) {
            throw new Error('La inspeccion solicitada no existe');
        }

        return response.data.data;
    },

    async createInspection(data: CreateInspectionDto): Promise<Inspection> {
        const response = await apiClient.post<ApiResponse<Inspection>>('/inspections', data);
        if (!response.data.data) {
            throw new Error('No se pudo crear la inspeccion');
        }

        return response.data.data;
    },

    async updateInspection(id: string, data: UpdateInspectionDto): Promise<Inspection> {
        const response = await apiClient.put<ApiResponse<Inspection>>(`/inspections/${id}`, data);
        if (!response.data.data) {
            throw new Error('No se pudo actualizar la inspeccion');
        }

        return response.data.data;
    },

    async updateStatus(id: string, status: Inspection['status']): Promise<Inspection> {
        const response = await apiClient.patch<ApiResponse<Inspection>>(`/inspections/${id}/status`, { status });
        if (!response.data.data) {
            throw new Error('No se pudo actualizar el estado de la inspeccion');
        }

        return response.data.data;
    },

    async deleteInspection(id: string): Promise<void> {
        await apiClient.delete(`/inspections/${id}`);
    },

    async getStats(): Promise<InspectionStats> {
        const response = await apiClient.get<ApiResponse<InspectionStats>>('/inspections/stats');
        if (!response.data.data) {
            throw new Error('No se pudieron obtener las estadisticas');
        }

        return response.data.data;
    },
};

export default inspectionService;
