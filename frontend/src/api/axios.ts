import axios from 'axios';
import authService from '../services/auth.service';

declare global {
    interface Window {
        __APP_CONFIG__?: {
            VITE_API_URL?: string;
        };
    }
}

type ApiErrorPayload = {
    message?: string;
    error?: {
        message?: string;
        code?: string;
    };
};

export const getApiErrorMessage = (error: unknown, fallback = 'Ocurrio un error inesperado') => {
    if (axios.isAxiosError<ApiErrorPayload>(error)) {
        return error.response?.data?.error?.message
            || error.response?.data?.message
            || error.message
            || fallback;
    }

    if (error instanceof Error) {
        return error.message;
    }

    return fallback;
};

export const isNetworkError = (error: unknown): boolean => {
    if (!axios.isAxiosError(error)) return false;

    const message = error.message || '';

    return !!(
        error.code === 'ERR_NETWORK'
        || error.code === 'ECONNABORTED'
        || message.includes('Network Error')
        || message.includes('timeout')
        || (!error.response && !error.request)
    );
};

const normalizeApiUrl = (value?: string) => value?.trim().replace(/\/+$/, '');

const API_URL = normalizeApiUrl(window.__APP_CONFIG__?.VITE_API_URL)
    || normalizeApiUrl(import.meta.env.VITE_API_URL);

if (!API_URL) {
    throw new Error('VITE_API_URL no esta configurado');
}

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 15000,
});

// Track if we're currently refreshing to avoid infinite loops
let isRefreshing = false;
let failedQueue: Array<{
    resolve: (value: unknown) => void;
    reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
    failedQueue.forEach(({ resolve, reject }) => {
        if (error) {
            reject(error);
        } else {
            resolve(token);
        }
    });
    failedQueue = [];
};

api.interceptors.request.use(
    (config) => {
        const requestUrl = config.url || '';
        const token = authService.getAccessToken();

        if (token && requestUrl !== '/auth/login' && requestUrl !== '/auth/register' && requestUrl !== '/auth/refresh') {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // Only handle 401 errors that are not from refresh or login endpoints
        const isAuthEndpoint = originalRequest?.url?.includes('/auth/login')
            || originalRequest?.url?.includes('/auth/register')
            || originalRequest?.url?.includes('/auth/refresh');

        if (
            axios.isAxiosError(error)
            && error.response?.status === 401
            && !isAuthEndpoint
            && !originalRequest._retry
        ) {
            const errorData = error.response?.data?.error;
            const isTokenExpired = errorData?.code === 'TOKEN_EXPIRED';

            if (isTokenExpired) {
                const refreshToken = authService.getRefreshToken();

                if (!refreshToken) {
                    authService.clearTokens();
                    window.location.href = '/login';
                    return Promise.reject(error);
                }

                if (isRefreshing) {
                    // Queue this request while refresh is in progress
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
                    const result = await authService.refresh(refreshToken);

                    if (result) {
                        processQueue(null, result.token);
                        originalRequest.headers.Authorization = `Bearer ${result.token}`;
                        return api(originalRequest);
                    }

                    // Refresh failed
                    processQueue(error, null);
                    authService.clearTokens();
                    window.location.href = '/login';
                    return Promise.reject(error);
                } catch (refreshError) {
                    processQueue(refreshError, null);
                    authService.clearTokens();
                    window.location.href = '/login';
                    return Promise.reject(refreshError);
                } finally {
                    isRefreshing = false;
                }
            }

            // Non-expired 401 (invalid token, user inactive, etc.)
            if (error.response) {
                authService.clearTokens();
                window.location.href = '/login';
            }
        }

        if (isNetworkError(error)) {
            console.warn('[api] Network error - backend may be offline:', error.message);
            error.isNetworkError = true;
        }

        return Promise.reject(error);
    }
);

export default api;
