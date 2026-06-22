import apiClient from '../api/axios';

export interface ApiKey {
    id: string;
    name: string;
    key: string;
    keyPreview: string;
    type: 'api_key' | 'secret_token';
    prefix: string | null;
    isActive: boolean;
    isExpired: boolean;
    expiresAt: string | null;
    lastUsedAt: string | null;
    description: string | null;
    createdAt: string;
    createdById: string;
}

interface ApiKeyListResponse {
    success: boolean;
    data: ApiKey[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

interface ApiKeyCreateResponse {
    success: boolean;
    message: string;
    data: ApiKey & { key: string };
}

const apiKeyService = {
    getAll: async (params?: { search?: string; type?: string; isActive?: boolean }) => {
        const query = new URLSearchParams();
        if (params?.search) query.set('search', params.search);
        if (params?.type) query.set('type', params.type);
        if (params?.isActive !== undefined) query.set('isActive', String(params.isActive));
        const qs = query.toString();
        const { data } = await apiClient.get<ApiKeyListResponse>(`/config/api-keys${qs ? `?${qs}` : ''}`);
        return data;
    },

    getById: async (id: string) => {
        const { data } = await apiClient.get<{ success: boolean; data: ApiKey }>(`/config/api-keys/${id}`);
        return data;
    },

    create: async (payload: { name: string; type?: string; description?: string; expiresAt?: string }) => {
        const { data } = await apiClient.post<ApiKeyCreateResponse>('/config/api-keys', payload);
        return data;
    },

    update: async (id: string, payload: { name?: string; isActive?: boolean; description?: string; expiresAt?: string | null }) => {
        const { data } = await apiClient.put<{ success: boolean; data: ApiKey }>(`/config/api-keys/${id}`, payload);
        return data;
    },

    revoke: async (id: string) => {
        const { data } = await apiClient.post<{ success: boolean; message: string }>(`/config/api-keys/${id}/revoke`);
        return data;
    },

    delete: async (id: string) => {
        const { data } = await apiClient.delete<{ success: boolean; message: string }>(`/config/api-keys/${id}`);
        return data;
    },
};

export default apiKeyService;
