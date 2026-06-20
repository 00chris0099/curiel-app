const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export default {
    // URL del backend
    API_URL: apiUrl,

    // Timeouts
    API_TIMEOUT: 30000,

    // AsyncStorage keys
    STORAGE_KEYS: {
        AUTH_TOKEN: '@curiel:auth_token',
        REFRESH_TOKEN: '@curiel:refresh_token',
        USER_DATA: '@curiel:user_data',
        OFFLINE_QUEUE: '@curiel:offline_queue',
        CACHED_INSPECTIONS: '@curiel:cached_inspections'
    },

    // SQLite
    DB_NAME: 'curiel.db',

    // Offline / Sync
    SYNC_INTERVAL_MS: 30000,
    AUTO_SAVE_INTERVAL_MS: 30000,
    MAX_RETRY_ATTEMPTS: 3,
    ENABLE_OFFLINE_MODE: true,

    // App
    APP_CONFIG: {
        MAX_PHOTO_SIZE: 5 * 1024 * 1024,
        PHOTO_QUALITY: 0.8
    }
};
