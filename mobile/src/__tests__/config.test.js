const config = require('../config').default;

describe('Mobile Config', () => {
    it('tiene API_URL configurado', () => {
        expect(config.API_URL).toBeDefined();
        expect(typeof config.API_URL).toBe('string');
    });

    it('tiene API_TIMEOUT configurado', () => {
        expect(config.API_TIMEOUT).toBe(30000);
    });

    it('tiene STORAGE_KEYS con todas las keys necesarias', () => {
        expect(config.STORAGE_KEYS.AUTH_TOKEN).toBe('@curiel:auth_token');
        expect(config.STORAGE_KEYS.REFRESH_TOKEN).toBe('@curiel:refresh_token');
        expect(config.STORAGE_KEYS.USER_DATA).toBe('@curiel:user_data');
        expect(config.STORAGE_KEYS.OFFLINE_QUEUE).toBe('@curiel:offline_queue');
        expect(config.STORAGE_KEYS.CACHED_INSPECTIONS).toBe('@curiel:cached_inspections');
    });

    it('tiene APP_CONFIG con valores validos', () => {
        expect(config.APP_CONFIG.MAX_PHOTO_SIZE).toBe(5 * 1024 * 1024);
        expect(config.APP_CONFIG.PHOTO_QUALITY).toBe(0.8);
        expect(config.ENABLE_OFFLINE_MODE).toBe(true);
    });
});
