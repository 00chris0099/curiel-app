import apiClient from '../api/axios';
import type { ApiResponse, User } from '../types';

export interface UsersListResponse {
    success: boolean;
    data: User[];
    meta?: {
        total: number;
        page: number;
        limit: number;
    };
}

const userService = {
    async getInspectors(): Promise<User[]> {
        const response = await apiClient.get<ApiResponse<User[]>>('/users/inspectors');
        return response.data.data ?? [];
    },

    async getAllUsers(): Promise<User[]> {
        const response = await apiClient.get<UsersListResponse>('/users');
        return response.data.data ?? [];
    },
};

export default userService;
