import axios from 'axios';
import apiClient from '../api/axios';
import type {
    Inspection,
    InspectionArea,
    InspectionExecutionData,
    InspectionExecutionSummary,
    InspectionPhoto,
    InspectionObservation,
    InspectionStats,
    InspectionFilters,
    CreateInspectionAreaDto,
    CreateInspectionDto,
    CreateInspectionObservationDto,
    CreateInspectionPhotoDto,
    UpdateInspectionDto,
    UpdateInspectionStatusDto,
    UpdateInspectionAreaDto,
    UpdateInspectionExecutionSummaryDto,
    UpdateInspectionObservationDto,
    ApiResponse,
    PaginatedResponse,
} from '../types';

interface ExecutionAreaMutationResponse {
    area: InspectionArea;
    summary: InspectionExecutionSummary;
}

interface ExecutionObservationMutationResponse {
    observation: InspectionObservation;
    summary: InspectionExecutionSummary;
}

interface ExecutionPhotoMutationResponse {
    photo: InspectionPhoto;
    summary: InspectionExecutionSummary;
}

interface ExecutionSummaryResponse {
    summary: InspectionExecutionSummary;
}

interface ExecutionCompletionResponse {
    inspection: Inspection;
    summary: InspectionExecutionSummary;
}

interface ExecutionDefaultAreasResponse {
    createdCount: number;
    summary: InspectionExecutionSummary;
    areas: Array<Pick<InspectionArea, 'name' | 'category' | 'sortOrder' | 'status'>>;
}

const parseBlobErrorMessage = async (blob: Blob, fallback: string) => {
    try {
        const text = await blob.text();
        const parsed = JSON.parse(text) as { message?: string; error?: { message?: string } };
        return parsed.error?.message || parsed.message || text || fallback;
    } catch {
        return fallback;
    }
};

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

    async updateStatus(id: string, data: UpdateInspectionStatusDto): Promise<Inspection> {
        const response = await apiClient.patch<ApiResponse<Inspection>>(`/inspections/${id}/status`, data);
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

    async getExecution(id: string): Promise<InspectionExecutionData> {
        const response = await apiClient.get<ApiResponse<InspectionExecutionData>>(`/inspections/${id}/execution`);
        if (!response.data.data) {
            throw new Error('No se pudo cargar la ejecución de la inspección');
        }

        return response.data.data;
    },

    async createDefaultAreas(id: string): Promise<ExecutionDefaultAreasResponse> {
        const response = await apiClient.post<ApiResponse<ExecutionDefaultAreasResponse>>(`/inspections/${id}/execution/areas/default`);
        if (!response.data.data) {
            throw new Error('No se pudieron crear las áreas por defecto');
        }

        return response.data.data;
    },

    async createExecutionArea(id: string, data: CreateInspectionAreaDto): Promise<ExecutionAreaMutationResponse> {
        const response = await apiClient.post<ApiResponse<ExecutionAreaMutationResponse>>(`/inspections/${id}/execution/areas`, data);
        if (!response.data.data) {
            throw new Error('No se pudo crear el área');
        }

        return response.data.data;
    },

    async updateExecutionArea(id: string, areaId: string, data: UpdateInspectionAreaDto): Promise<ExecutionAreaMutationResponse> {
        const response = await apiClient.put<ApiResponse<ExecutionAreaMutationResponse>>(`/inspections/${id}/execution/areas/${areaId}`, data);
        if (!response.data.data) {
            throw new Error('No se pudo actualizar el área');
        }

        return response.data.data;
    },

    async deleteExecutionArea(id: string, areaId: string): Promise<ExecutionAreaMutationResponse> {
        const response = await apiClient.delete<ApiResponse<ExecutionAreaMutationResponse>>(`/inspections/${id}/execution/areas/${areaId}`);
        if (!response.data.data) {
            throw new Error('No se pudo eliminar el área');
        }

        return response.data.data;
    },

    async createExecutionObservation(id: string, data: CreateInspectionObservationDto): Promise<ExecutionObservationMutationResponse> {
        const response = await apiClient.post<ApiResponse<ExecutionObservationMutationResponse>>(`/inspections/${id}/execution/observations`, data);
        if (!response.data.data) {
            throw new Error('No se pudo crear la observación');
        }

        return response.data.data;
    },

    async updateExecutionObservation(id: string, observationId: string, data: UpdateInspectionObservationDto): Promise<ExecutionObservationMutationResponse> {
        const response = await apiClient.put<ApiResponse<ExecutionObservationMutationResponse>>(`/inspections/${id}/execution/observations/${observationId}`, data);
        if (!response.data.data) {
            throw new Error('No se pudo actualizar la observación');
        }

        return response.data.data;
    },

    async deleteExecutionObservation(id: string, observationId: string): Promise<ExecutionObservationMutationResponse> {
        const response = await apiClient.delete<ApiResponse<ExecutionObservationMutationResponse>>(`/inspections/${id}/execution/observations/${observationId}`);
        if (!response.data.data) {
            throw new Error('No se pudo eliminar la observación');
        }

        return response.data.data;
    },

    async createExecutionPhoto(id: string, data: CreateInspectionPhotoDto, file?: File): Promise<ExecutionPhotoMutationResponse> {
        const payload = new FormData();

        payload.append('type', data.type);
        if (data.areaId) payload.append('areaId', data.areaId);
        if (data.observationId) payload.append('observationId', data.observationId);
        if (data.caption) payload.append('caption', data.caption);
        if (data.url) payload.append('url', data.url);
        if (file) payload.append('photo', file);

        const response = await apiClient.post<ApiResponse<ExecutionPhotoMutationResponse>>(`/inspections/${id}/execution/photos`, payload, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });

        if (!response.data.data) {
            throw new Error('No se pudo registrar la foto');
        }

        return response.data.data;
    },

    async updateExecutionSummary(id: string, data: UpdateInspectionExecutionSummaryDto): Promise<ExecutionSummaryResponse> {
        const response = await apiClient.put<ApiResponse<ExecutionSummaryResponse>>(`/inspections/${id}/execution/summary`, data);
        if (!response.data.data) {
            throw new Error('No se pudo actualizar el resumen');
        }

        return response.data.data;
    },

    async completeExecution(id: string, reportStatus?: 'listo_para_revision' | 'aprobado'): Promise<ExecutionCompletionResponse> {
        const response = await apiClient.post<ApiResponse<ExecutionCompletionResponse>>(`/inspections/${id}/execution/complete`, reportStatus ? { reportStatus } : {});
        if (!response.data.data) {
            throw new Error('No se pudo finalizar la inspección');
        }

        return response.data.data;
    },

    async downloadReport(id: string): Promise<Blob> {
        try {
            const response = await apiClient.get<Blob>(`/inspections/${id}/report`, {
                responseType: 'blob',
            });

            const contentType = String(response.headers['content-type'] || response.data.type || '').toLowerCase();

            if (!contentType.includes('application/pdf')) {
                const message = await parseBlobErrorMessage(response.data, 'El servidor no devolvió un PDF válido');
                throw new Error(message);
            }

            return new Blob([response.data], { type: 'application/pdf' });
        } catch (error: unknown) {
            if (axios.isAxiosError(error) && error.response?.data instanceof Blob) {
                const message = await parseBlobErrorMessage(error.response.data, 'No se pudo generar el informe PDF');
                throw new Error(message);
            }

            throw error;
        }
    },
};

export default inspectionService;
