const jwt = require('jsonwebtoken');
const config = require('../config');
const { prisma } = require('../lib/databases');

const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                error: {
                    code: 'MISSING_TOKEN',
                    message: 'No se proporciono token de autenticacion'
                }
            });
        }

        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, config.jwt.secret);

        const user = await prisma.auth.user.findUnique({
            where: { id: decoded.userId },
            include: {
                roles: {
                    include: { role: true }
                }
            }
        });

        if (!user || !user.isActive) {
            return res.status(401).json({
                success: false,
                error: {
                    code: 'USER_NOT_FOUND',
                    message: 'Usuario no encontrado o inactivo'
                }
            });
        }

        const roles = (user.roles || []).map(ur => ur.role.name);

        req.user = user;
        req.userId = user.id;
        req.userRoles = roles;
        req.userRole = roles.length ? roles[0] : null;
        req.isMasterAdmin = user.isMasterAdmin;

        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                error: {
                    code: 'INVALID_TOKEN',
                    message: 'Token invalido'
                }
            });
        }

        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                error: {
                    code: 'TOKEN_EXPIRED',
                    message: 'Token expirado'
                }
            });
        }

        return res.status(500).json({
            success: false,
            error: {
                code: 'AUTH_ERROR',
                message: 'Error de autenticacion',
                ...(process.env.NODE_ENV === 'development' && { details: error.message })
            }
        });
    }
};

const authorize = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Usuario no autenticado'
            });
        }

        if (req.user.isMasterAdmin) {
            return next();
        }

        const userRoles = req.userRoles || [];

        const hasAllowedRole = allowedRoles.some((role) => userRoles.includes(role));
        if (!hasAllowedRole) {
            return res.status(403).json({
                success: false,
                message: 'No tienes permisos para realizar esta accion'
            });
        }

        next();
    };
};

const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return next();
        }

        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, config.jwt.secret);

        const user = await prisma.auth.user.findUnique({
            where: { id: decoded.userId },
            include: {
                roles: {
                    include: { role: true }
                }
            }
        });

        if (user && user.isActive) {
            const roles = (user.roles || []).map(ur => ur.role.name);

            req.user = user;
            req.userId = user.id;
            req.userRoles = roles;
            req.userRole = roles.length ? roles[0] : null;
            req.isMasterAdmin = user.isMasterAdmin;
        }

        next();
    } catch (error) {
        next();
    }
};

module.exports = {
    authenticate,
    authorize,
    optionalAuth
};
