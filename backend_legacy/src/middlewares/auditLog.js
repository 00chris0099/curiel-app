const { AuditLog } = require('../models');

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
                console.error('Error al crear audit log:', error);
                // No fallar la request si el log falla
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
        console.error('Error al crear audit log:', error);
    }
};

module.exports = {
    auditLog,
    createAuditLog
};
