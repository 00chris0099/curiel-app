import apiClient from '../api/axios';
import type {
    Evaluation,
    CreateEvaluationDto,
    ApiResponse,
    PaginatedResponse,
} from '../types';

const evaluationService = {
    async getAll(filters: { evaluatedUserId?: string; status?: string; page?: number; limit?: number } = {}): Promise<PaginatedResponse<Evaluation>> {
        const params = new URLSearchParams();
        if (filters.evaluatedUserId) params.append('evaluatedUserId', filters.evaluatedUserId);
        if (filters.status) params.append('status', filters.status);
        if (filters.page) params.append('page', String(filters.page));
        if (filters.limit) params.append('limit', String(filters.limit));

        const response = await apiClient.get<PaginatedResponse<Evaluation>>(
            `/evaluations?${params.toString()}`
        );
        return response.data;
    },

    async getById(id: string): Promise<ApiResponse<{ evaluation: Evaluation }>> {
        const response = await apiClient.get<ApiResponse<{ evaluation: Evaluation }>>(
            `/evaluations/${id}`
        );
        return response.data;
    },

    async create(data: CreateEvaluationDto): Promise<ApiResponse<{ evaluation: Evaluation }>> {
        const response = await apiClient.post<ApiResponse<{ evaluation: Evaluation }>>(
            '/evaluations',
            data
        );
        return response.data;
    },

    async update(id: string, data: { notes?: string; actions?: string; status?: string }): Promise<ApiResponse<{ evaluation: Evaluation }>> {
        const response = await apiClient.put<ApiResponse<{ evaluation: Evaluation }>>(
            `/evaluations/${id}`,
            data
        );
        return response.data;
    },

    async generateBulk(weekStart: string, weekEnd: string): Promise<ApiResponse<{ results: Array<{ userId: string; success: boolean; error?: string }> }>> {
        const response = await apiClient.post<ApiResponse<{ results: Array<{ userId: string; success: boolean; error?: string }> }>>(
            '/evaluations/bulk',
            { weekStart, weekEnd }
        );
        return response.data;
    },

    async getInspectorRanking(weekStart: string, weekEnd: string): Promise<ApiResponse<{ ranking: Array<{ userId: string; fullName: string; score: number; inspectionsCompleted: number; punctualityRate: number }> }>> {
        const response = await apiClient.get(
            `/evaluations/ranking/inspectors?weekStart=${weekStart}&weekEnd=${weekEnd}`
        );
        return response.data;
    },

    async getArchitectRanking(weekStart: string, weekEnd: string): Promise<ApiResponse<{ ranking: Array<{ userId: string; fullName: string; score: number; inspectionsCreated: number; approvalRate: number }> }>> {
        const response = await apiClient.get(
            `/evaluations/ranking/architects?weekStart=${weekStart}&weekEnd=${weekEnd}`
        );
        return response.data;
    },
};

export default evaluationService;
