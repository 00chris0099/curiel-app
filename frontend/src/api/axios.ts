import axios from 'axios';

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

api.interceptors.request.use(
    (config) => {
        const requestUrl = config.url || '';
        const token = localStorage.getItem('token');

        if (token && requestUrl !== '/auth/login' && requestUrl !== '/auth/register') {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (axios.isAxiosError(error) && error.response?.status === 401) {
            // Only logout on actual 401 from backend, not network errors
            if (error.response) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '/login';
            }
        }

        if (isNetworkError(error)) {
            console.warn('[api] Network error - backend may be offline:', error.message);
            // Mark the error for easy identification
            error.isNetworkError = true;
        }

        return Promise.reject(error);
    }
);

export default api;
