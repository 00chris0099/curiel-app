const { prisma } = require('../lib/databases');
const logger = require('../utils/logger');

const auditLog = (action, entityType = null) => {
    return async (req, res, next) => {
        const originalJson = res.json.bind(res);

        res.json = async function (data) {
            try {
                if (res.statusCode < 400 && req.user) {
                    await prisma.auditoria.auditLog.create({
                        data: {
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
                        }
                    });
                }
            } catch (error) {
                logger.error('Error al crear audit log (middleware)', { error: error.message });
            }

            return originalJson(data);
        };

        next();
    };
};

const createAuditLog = async (userId, action, entityType, entityId, changes = null) => {
    try {
        await prisma.auditoria.auditLog.create({
            data: {
                userId,
                action,
                entityType,
                entityId,
                changes
            }
        });
    } catch (error) {
        logger.error('Error al crear audit log (manual)', { error: error.message });
    }
};

module.exports = {
    auditLog,
    createAuditLog
};
