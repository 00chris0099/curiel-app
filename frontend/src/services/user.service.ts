import apiClient from '../api/axios';
import type { ApiResponse, CreateUserDto, UpdateUserDto, User, UserRole, UserStats } from '../types';

interface UsersListResponse {
    success: boolean;
    data: User[];
    pagination?: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

interface UserMutationResponse {
    success: boolean;
    message?: string;
    data: {
        user: User;
    };
}

interface UserStatsResponse {
    success: boolean;
    data: {
        stats: UserStats;
    };
}

interface UsersQueryParams {
    search?: string;
    role?: UserRole;
    isActive?: boolean;
    page?: number;
    limit?: number;
}

interface CreateUserApiPayload {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    phone?: string;
}

const userService = {
    async getInspectors(): Promise<User[]> {
        const response = await apiClient.get<ApiResponse<User[]>>('/users/inspectors');
        return response.data.data ?? [];
    },

    async getAllUsers(params: UsersQueryParams = {}): Promise<UsersListResponse> {
        const response = await apiClient.get<UsersListResponse>('/users', { params });
        return response.data;
    },

    async createUser(data: CreateUserDto): Promise<User> {
        const payload: CreateUserApiPayload = {
            email: data.email.trim(),
            password: data.password,
            firstName: data.firstName.trim(),
            lastName: data.lastName.trim(),
            role: data.role,
            phone: data.phone?.trim() || undefined,
        };

        const response = await apiClient.post<UserMutationResponse>('/users', payload);
        return response.data.data.user;
    },

    async updateUser(userId: string, data: UpdateUserDto): Promise<User> {
        const response = await apiClient.put<UserMutationResponse>(`/users/${userId}`, data);
        return response.data.data.user;
    },

    async toggleUserStatus(userId: string, isActive: boolean): Promise<User> {
        const response = await apiClient.patch<UserMutationResponse>(`/users/${userId}/status`, { isActive });
        return response.data.data.user;
    },

    async deleteUser(userId: string): Promise<User> {
        const response = await apiClient.delete<UserMutationResponse>(`/users/${userId}`);
        return response.data.data.user;
    },

    async transferMasterAdmin(userId: string): Promise<User> {
        const response = await apiClient.post<UserMutationResponse>(`/users/${userId}/transfer-master`);
        return response.data.data.user;
    },

    async getStats(): Promise<UserStats> {
        const response = await apiClient.get<UserStatsResponse>('/users/stats');
        return response.data.data.stats;
    }
};

export default userService;
