import axios from 'axios';

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

const apiClient = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
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
