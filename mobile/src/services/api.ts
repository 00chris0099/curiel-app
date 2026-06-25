import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import config from '../config';

// Auth failure callback registry (used by AuthContext)
let onAuthFailure = null;

export const registerAuthFailureHandler = (handler) => {
    onAuthFailure = handler;
};

// Crear instancia de axios
const api = axios.create({
    baseURL: config.API_URL,
    timeout: config.API_TIMEOUT,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Track if we're currently refreshing
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
    failedQueue.forEach(({ resolve, reject }) => {
        if (error) {
            reject(error);
        } else {
            resolve(token);
        }
    });
    failedQueue = [];
};

// Offline interceptor: queue requests when offline
api.interceptors.request.use(
    async (requestConfig) => {
        // Skip offline check for auth endpoints
        const requestUrl = requestConfig.url || '';
        if (requestUrl.includes('/auth/login') || requestUrl.includes('/auth/refresh')) {
            return requestConfig;
        }

        const state = await NetInfo.fetch();
        const isOnline = state.isConnected && state.isInternetReachable !== false;

        if (!isOnline && requestConfig.method !== 'get') {
            // For mutation requests when offline, throw a specific error
            const error = new Error('OFFLINE_QUEUED');
            error.config = requestConfig;
            return Promise.reject(error);
        }

        try {
            const token = await AsyncStorage.getItem(config.STORAGE_KEYS.AUTH_TOKEN);
            if (token && !requestUrl.includes('/auth/login') && !requestUrl.includes('/auth/register') && !requestUrl.includes('/auth/refresh')) {
                requestConfig.headers.Authorization = `Bearer ${token}`;
            }
        } catch (error) {
            console.error('Error al obtener token:', error);
        }
        return requestConfig;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Interceptor para manejar respuestas y errores con auto-refresh
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        const isAuthEndpoint = originalRequest?.url?.includes('/auth/login')
            || originalRequest?.url?.includes('/auth/register')
            || originalRequest?.url?.includes('/auth/refresh');

        if (
            error.response?.status === 401
            && !isAuthEndpoint
            && !originalRequest._retry
        ) {
            const errorData = error.response?.data?.error;
            const isTokenExpired = errorData?.code === 'TOKEN_EXPIRED';

            if (isTokenExpired) {
                const refreshToken = await AsyncStorage.getItem(config.STORAGE_KEYS.REFRESH_TOKEN);

                if (!refreshToken) {
                    await AsyncStorage.multiRemove([
                        config.STORAGE_KEYS.AUTH_TOKEN,
                        config.STORAGE_KEYS.REFRESH_TOKEN,
                        config.STORAGE_KEYS.USER_DATA
                    ]);
                    if (onAuthFailure) onAuthFailure();
                    return Promise.reject(error);
                }

                if (isRefreshing) {
                    return new Promise((resolve, reject) => {
                        failedQueue.push({ resolve, reject });
                    }).then((token) => {
                        originalRequest.headers.Authorization = `Bearer ${token}`;
                        return api(originalRequest);
                    });
                }

                originalRequest._retry = true;
                isRefreshing = true;

                try {
                    const response = await axios.post(
                        `${config.API_URL}/auth/refresh`,
                        { refreshToken },
                        { headers: { 'Content-Type': 'application/json' } }
                    );

                    if (response.data.success) {
                        const { token: newToken, refreshToken: newRefreshToken } = response.data.data;
                        await AsyncStorage.multiSet([
                            [config.STORAGE_KEYS.AUTH_TOKEN, newToken],
                            [config.STORAGE_KEYS.REFRESH_TOKEN, newRefreshToken]
                        ]);

                        processQueue(null, newToken);
                        originalRequest.headers.Authorization = `Bearer ${newToken}`;
                        return api(originalRequest);
                    }

                    processQueue(error, null);
                    await AsyncStorage.multiRemove([
                        config.STORAGE_KEYS.AUTH_TOKEN,
                        config.STORAGE_KEYS.REFRESH_TOKEN,
                        config.STORAGE_KEYS.USER_DATA
                    ]);
                    if (onAuthFailure) onAuthFailure();
                    return Promise.reject(error);
                } catch (refreshError) {
                    processQueue(refreshError, null);
                    await AsyncStorage.multiRemove([
                        config.STORAGE_KEYS.AUTH_TOKEN,
                        config.STORAGE_KEYS.REFRESH_TOKEN,
                        config.STORAGE_KEYS.USER_DATA
                    ]);
                    if (onAuthFailure) onAuthFailure();
                    return Promise.reject(refreshError);
                } finally {
                    isRefreshing = false;
                }
            }

            // Non-expired 401
            await AsyncStorage.multiRemove([
                config.STORAGE_KEYS.AUTH_TOKEN,
                config.STORAGE_KEYS.REFRESH_TOKEN,
                config.STORAGE_KEYS.USER_DATA
            ]);
            if (onAuthFailure) onAuthFailure();
        }
        return Promise.reject(error);
    }
);

// ===========================
// SERVICIOS DE API
// ===========================

export const authService = {
    login: async (email, password) => {
        const response = await api.post('/auth/login', { email, password });
        return response.data;
    },

    refresh: async (refreshToken) => {
        const response = await api.post('/auth/refresh', { refreshToken });
        return response.data;
    },

    logout: async (refreshToken) => {
        try {
            await api.post('/auth/logout', { refreshToken });
        } catch {
            // Best effort - continue with local cleanup
        }
    },

    getProfile: async () => {
        const response = await api.get('/auth/me');
        return response.data;
    },

    updateProfile: async (data) => {
        const response = await api.put('/auth/me', data);
        return response.data;
    },

    changePassword: async (currentPassword, newPassword) => {
        const response = await api.put('/auth/change-password', {
            currentPassword,
            newPassword
        });
        return response.data;
    }
};

export const inspectionService = {
    getAll: async (filters = {}) => {
        const response = await api.get('/inspections', { params: filters });
        return response.data;
    },

    getById: async (id) => {
        const response = await api.get(`/inspections/${id}`);
        return response.data;
    },

    create: async (data) => {
        const response = await api.post('/inspections', data);
        return response.data;
    },

    update: async (id, data) => {
        const response = await api.put(`/inspections/${id}`, data);
        return response.data;
    },

    complete: async (id) => {
        const response = await api.post(`/inspections/${id}/complete`);
        return response.data;
    },

    delete: async (id) => {
        const response = await api.delete(`/inspections/${id}`);
        return response.data;
    }
};

export const photoService = {
    upload: async (uri, inspectionId, checklistItemId = null, caption = null) => {
        const formData = new FormData();

        // Crear objeto de archivo - forzar WebP
        const filename = uri.split('/').pop();
        const type = filename.endsWith('.webp') ? 'image/webp' : 'image/jpeg';

        formData.append('photo', {
            uri,
            name: filename,
            type
        });

        formData.append('inspectionId', inspectionId);
        if (checklistItemId) formData.append('checklistItemId', checklistItemId);
        if (caption) formData.append('caption', caption);

        const response = await api.post('/photos/upload', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });

        return response.data;
    }
};

export default api;
