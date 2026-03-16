import axios from 'axios';

// ============================================
// BASE URL apuntando a n8n
// ============================================
const N8N_BASE_URL = import.meta.env.VITE_API_URL || 'https://tu-n8n.com/webhook/';

// ============================================
// Rutas de webhooks configurables por .env
// ============================================
export const N8N_ENDPOINTS = {
    login: `${N8N_BASE_URL}${import.meta.env.VITE_N8N_LOGIN || 'auth/login'}`,
    register: `${N8N_BASE_URL}${import.meta.env.VITE_N8N_REGISTER || 'auth/register'}`,
    inspection: `${N8N_BASE_URL}${import.meta.env.VITE_N8N_INSPECTION || 'data/inspeccion'}`,
} as const;

// ============================================
// Cliente axios genérico (sin baseURL fija)
// Cada servicio construye la URL completa usando N8N_ENDPOINTS
// ============================================
const apiClient = axios.create({
    headers: {
        'Content-Type': 'application/json',
    },
    // Timeout para que el frontend no se quede colgado si n8n no responde
    timeout: 15000,
});

// ============================================
// Interceptor de REQUEST: adjunta el token si existe
// ============================================
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

// ============================================
// Interceptor de RESPONSE: manejo global de errores
// Si el token expiró (401), limpia sesión y redirige a /login
// ============================================
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        // Token inválido o expirado devuelto por n8n
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }

        // Si n8n no responde (timeout / red caída), error descriptivo
        if (error.code === 'ECONNABORTED' || !error.response) {
            console.warn('[n8n] El webhook no respondió o está fuera de línea.');
        }

        return Promise.reject(error);
    }
);

export default apiClient;
