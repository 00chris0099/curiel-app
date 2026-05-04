import axios from 'axios';

type RuntimeConfig = {
    VITE_API_URL?: string;
};

type ApiErrorPayload = {
    message?: string;
    error?: {
        message?: string;
        code?: string;
    };
};

declare global {
    interface Window {
        __APP_CONFIG__?: RuntimeConfig;
    }
}

const normalizeBaseUrl = (value?: string) => value?.trim().replace(/\/+$/, '');

const getApiBaseUrl = () => {
    const runtimeUrl = normalizeBaseUrl(window.__APP_CONFIG__?.VITE_API_URL);
    const envUrl = normalizeBaseUrl(import.meta.env.VITE_API_URL);

    if (runtimeUrl) {
        return runtimeUrl;
    }

    if (envUrl) {
        return envUrl;
    }

    if (import.meta.env.DEV) {
        return 'http://localhost:4000/api/v1';
    }

    return '/api/v1';
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

const apiClient = axios.create({
    baseURL: getApiBaseUrl(),
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 15000,
});

apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }

        if (error.code === 'ECONNABORTED' || !error.response) {
            console.warn('[api] El backend no respondio o esta fuera de linea.');
        }

        return Promise.reject(error);
    }
);

export default apiClient;
