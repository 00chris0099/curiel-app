const { AuditLog } = require('../models');
const logger = require('../utils/logger');

/**
 * Middleware para crear logs de auditoría
 */
const auditLog = (action, entityType = null) => {
    return async (req, res, next) => {
        // Guardar el método original res.json
        const originalJson = res.json.bind(res);

        // Sobrescribir res.json para capturar la respuesta
        res.json = async function (data) {
            try {
                // Solo registrar si la operación fue exitosa
                if (res.statusCode < 400 && req.user) {
                    const logData = {
                        userId: req.user.id,
                        action,
                        entityType,
                        entityId: req.params.id || data?.data?.id || null,
                        changes: {
                            body: req.body,
                            params: req.params,
                            query: req.query
                        },
                        ipAddress: req.ip || req.connection.remoteAddress,
                        userAgent: req.headers['user-agent'],
                        details: {
                            method: req.method,
                            path: req.path,
                            statusCode: res.statusCode
                        }
                    };

                    await AuditLog.create(logData);
                }
            } catch (error) {
                logger.error('Error al crear audit log (middleware)', { error: error.message });
            }

            // Llamar al método original
            return originalJson(data);
        };

        next();
    };
};

/**
 * Crear log manualmente
 */
const createAuditLog = async (userId, action, entityType, entityId, changes = null) => {
    try {
        await AuditLog.create({
            userId,
            action,
            entityType,
            entityId,
            changes
        });
    } catch (error) {
        logger.error('Error al crear audit log (manual)', { error: error.message });
    }
};

module.exports = {
    auditLog,
    createAuditLog
};
