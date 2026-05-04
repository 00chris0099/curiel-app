import apiClient from '../api/axios';
import type {
    User,
    LoginCredentials,
    LoginResponse,
} from '../types';

const authService = {
    async login(credentials: LoginCredentials): Promise<LoginResponse> {
        const response = await apiClient.post<LoginResponse>('/auth/login', credentials);

        if (response.data.success) {
            localStorage.setItem('token', response.data.data.token);
            localStorage.setItem('user', JSON.stringify(response.data.data.user));
        }

        return response.data;
    },

    async register(userData: {
        email: string;
        password: string;
        firstName: string;
        lastName: string;
    }): Promise<LoginResponse> {
        const response = await apiClient.post<LoginResponse>('/auth/register', userData);

        if (response.data.success && response.data.data?.token) {
            localStorage.setItem('token', response.data.data.token);
            localStorage.setItem('user', JSON.stringify(response.data.data.user));
        }

        return response.data;
    },

    logout(): void {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    },

    getCurrentUser(): User | null {
        const userStr = localStorage.getItem('user');
        if (!userStr) return null;
        try {
            return JSON.parse(userStr);
        } catch {
            return null;
        }
    },

    isAuthenticated(): boolean {
        return !!localStorage.getItem('token');
    },

    async getProfile(): Promise<User> {
        const response = await apiClient.get<{ success: boolean; data: User }>('/auth/me');
        const userData = response.data.data;

        if (response.data.success && userData) {
            localStorage.setItem('user', JSON.stringify(userData));
        }

        return userData;
    },

    async updateProfile(data: Partial<User>): Promise<User> {
        const response = await apiClient.put<{ success: boolean; data: User }>('/auth/me', data);
        const userData = response.data.data;

        if (response.data.success && userData) {
            localStorage.setItem('user', JSON.stringify(userData));
        }

        return userData;
    },

    async changePassword(currentPassword: string, newPassword: string): Promise<void> {
        await apiClient.put('/auth/change-password', { currentPassword, newPassword });
    },
};

export default authService;
