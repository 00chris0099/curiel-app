const Redis = require('ioredis');
const config = require('../config');
const logger = require('./logger');

let redis = null;
let isConnected = false;

/**
 * Inicializar conexion Redis
 */
const initRedis = () => {
    if (!config.redis?.url) {
        logger.warn('Redis no configurado (REDIS_URL no definido). Cache deshabilitado.');
        return null;
    }

    try {
        redis = new Redis(config.redis.url, {
            maxRetriesPerRequest: 3,
            retryStrategy(times) {
                const delay = Math.min(times * 50, 2000);
                return delay;
            },
            lazyConnect: true
        });

        redis.on('connect', () => {
            isConnected = true;
            logger.info('Redis conectado');
        });

        redis.on('error', (err) => {
            isConnected = false;
            logger.error('Redis error:', { error: err.message });
        });

        redis.on('close', () => {
            isConnected = false;
        });

        return redis;
    } catch (error) {
        logger.error('Error inicializando Redis:', { error: error.message });
        return null;
    }
};

/**
 * Obtener valor del cache
 * @param {string} key
 * @returns {Promise<any|null>}
 */
const cacheGet = async (key) => {
    if (!redis || !isConnected) return null;

    try {
        const value = await redis.get(key);
        if (value) {
            return JSON.parse(value);
        }
        return null;
    } catch (error) {
        logger.error('Cache GET error:', { key, error: error.message });
        return null;
    }
};

/**
 * Guardar valor en cache
 * @param {string} key
 * @param {any} value
 * @param {number} ttlSeconds - Tiempo de vida en segundos (default: 5 min)
 */
const cacheSet = async (key, value, ttlSeconds = 300) => {
    if (!redis || !isConnected) return;

    try {
        await redis.setex(key, ttlSeconds, JSON.stringify(value));
    } catch (error) {
        logger.error('Cache SET error:', { key, error: error.message });
    }
};

/**
 * Eliminar valor del cache
 * @param {string} key
 */
const cacheDel = async (key) => {
    if (!redis || !isConnected) return;

    try {
        await redis.del(key);
    } catch (error) {
        logger.error('Cache DEL error:', { key, error: error.message });
    }
};

/**
 * Eliminar todas las claves que coincidan con un patron
 * @param {string} pattern
 */
const cacheDelPattern = async (pattern) => {
    if (!redis || !isConnected) return;

    try {
        const keys = await redis.keys(pattern);
        if (keys.length > 0) {
            await redis.del(...keys);
        }
    } catch (error) {
        logger.error('Cache DEL pattern error:', { pattern, error: error.message });
    }
};

/**
 * Obtener estado de la conexion
 */
const getCacheStatus = () => ({
    connected: isConnected,
    url: config.redis?.url ? '***configured***' : 'not configured'
});

/**
 * Cerrar conexion Redis
 */
const closeRedis = async () => {
    if (redis) {
        await redis.quit();
        redis = null;
        isConnected = false;
    }
};

module.exports = {
    initRedis,
    cacheGet,
    cacheSet,
    cacheDel,
    cacheDelPattern,
    getCacheStatus,
    closeRedis
};
