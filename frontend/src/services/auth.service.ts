import api from '../api/axios';
import type {
    User,
    LoginCredentials,
    LoginResponse,
} from '../types';

const STORAGE_KEYS = {
    ACCESS_TOKEN: 'accessToken',
    REFRESH_TOKEN: 'refreshToken',
    USER: 'user',
} as const;

const authService = {
    async login(credentials: LoginCredentials): Promise<LoginResponse> {
        const response = await api.post<LoginResponse>('/auth/login', credentials);

        if (response.data.success) {
            this.storeTokens(response.data.data.token, response.data.data.refreshToken);
            localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(response.data.data.user));
        }

        return response.data;
    },

    async register(userData: {
        email: string;
        password: string;
        firstName: string;
        lastName: string;
    }): Promise<LoginResponse> {
        const response = await api.post<LoginResponse>('/auth/register', userData);

        if (response.data.success && response.data.data?.token) {
            this.storeTokens(response.data.data.token, response.data.data.refreshToken);
            localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(response.data.data.user));
        }

        return response.data;
    },

    async refresh(refreshToken: string): Promise<{ token: string; refreshToken: string } | null> {
        try {
            const response = await api.post<{ success: boolean; data: { token: string; refreshToken: string } }>(
                '/auth/refresh',
                { refreshToken }
            );

            if (response.data.success) {
                this.storeTokens(response.data.data.token, response.data.data.refreshToken);
                return response.data.data;
            }
        } catch {
            // Refresh failed - user needs to login again
        }
        return null;
    },

    logout(): void {
        // Attempt to revoke refresh token on backend (best effort)
        const refreshToken = this.getRefreshToken();
        if (refreshToken) {
            api.post('/auth/logout', { refreshToken }).catch(() => {});
        }
        this.clearTokens();
    },

    storeTokens(accessToken: string, refreshToken: string): void {
        localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
        localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
    },

    getAccessToken(): string | null {
        return localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    },

    getRefreshToken(): string | null {
        return localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
    },

    clearTokens(): void {
        localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
        localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
        localStorage.removeItem(STORAGE_KEYS.USER);
    },

    getCurrentUser(): User | null {
        const userStr = localStorage.getItem(STORAGE_KEYS.USER);
        if (!userStr) return null;
        try {
            return JSON.parse(userStr);
        } catch {
            return null;
        }
    },

    isAuthenticated(): boolean {
        return !!this.getAccessToken();
    },

    async getProfile(): Promise<User> {
        const response = await api.get<{ success: boolean; data: User }>('/auth/me');
        const userData = response.data.data;

        if (response.data.success && userData) {
            localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userData));
        }

        return userData;
    },

    async updateProfile(data: Partial<User>): Promise<User> {
        const response = await api.put<{ success: boolean; data: User }>('/auth/me', data);
        const userData = response.data.data;

        if (response.data.success && userData) {
            localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userData));
        }

        return userData;
    },

    async changePassword(currentPassword: string, newPassword: string): Promise<void> {
        await api.put('/auth/change-password', { currentPassword, newPassword });
    },
};

export default authService;
