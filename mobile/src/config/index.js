const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

// Variables de entorno para la app móvil
export default {
    // URL del backend
    API_URL: apiUrl,

    // En producción, usar EXPO_PUBLIC_API_URL=https://api.tudominio.com/api/v1

    // Timeouts
    API_TIMEOUT: 30000, // 30 segundos

    // AsyncStorage keys
    STORAGE_KEYS: {
        AUTH_TOKEN: '@curiel:auth_token',
        USER_DATA: '@curiel:user_data',
        OFFLINE_QUEUE: '@curiel:offline_queue',
        CACHED_INSPECTIONS: '@curiel:cached_inspections'
    },

    // Configuración de la app
    APP_CONFIG: {
        MAX_PHOTO_SIZE: 5 * 1024 * 1024, // 5MB
        PHOTO_QUALITY: 0.8,
        ENABLE_OFFLINE_MODE: true
    }
};
