import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import config from '../config';

// Crear instancia de axios
const api = axios.create({
    baseURL: config.API_URL,
    timeout: config.API_TIMEOUT,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Interceptor para agregar token automáticamente
api.interceptors.request.use(
    async (requestConfig) => {
        try {
            const token = await AsyncStorage.getItem(config.STORAGE_KEYS.AUTH_TOKEN);
            if (token) {
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

// Interceptor para manejar respuestas y errores
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response?.status === 401) {
            // Token expirado o inválido - limpiar storage y redirigir a login
            await AsyncStorage.multiRemove([
                config.STORAGE_KEYS.AUTH_TOKEN,
                config.STORAGE_KEYS.USER_DATA
            ]);
            // Aquí podrías disparar un evento para navegar a login
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

        // Crear objeto de archivo
        const filename = uri.split('/').pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';

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
