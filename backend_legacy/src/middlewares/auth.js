const jwt = require('jsonwebtoken');
const config = require('../config');
const { User, Role } = require('../models');

/**
 * Middleware para verificar JWT token
 */
const authenticate = async (req, res, next) => {
    try {
        // Obtener token del header
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'No se proporcionó token de autenticación'
            });
        }

        const token = authHeader.substring(7);

        // Verificar token
        const decoded = jwt.verify(token, config.jwt.secret);

        // Buscar usuario con roles
        const user = await User.findByPk(decoded.userId, {
            include: [{ model: Role, as: 'roles', attributes: ['name'] }]
        });

        if (!user || !user.isActive) {
            return res.status(401).json({
                success: false,
                message: 'Usuario no encontrado o inactivo'
            });
        }

        const roles = (user.roles || []).map(r => r.name);

        // Agregar usuario al request
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
                message: 'Token inválido'
            });
        }

        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token expirado'
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Error de autenticación',
            error: error.message
        });
    }
};

/**
 * Middleware para verificar roles específicos
 * @param  {...string} allowedRoles - Roles permitidos
 */
const authorize = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Usuario no autenticado'
            });
        }

        // El master admin siempre tiene permisos completos
        if (req.user.isMasterAdmin) {
            return next();
        }

        const userRoles = req.userRoles || [];

        const hasAllowedRole = allowedRoles.some((role) => userRoles.includes(role));
        if (!hasAllowedRole) {
            return res.status(403).json({
                success: false,
                message: 'No tienes permisos para realizar esta acción'
            });
        }

        next();
    };
};

/**
 * Middleware opcional de autenticación (no falla si no hay token)
 */
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return next();
        }

        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, config.jwt.secret);
        const user = await User.findByPk(decoded.userId, {
            include: [{ model: Role, as: 'roles', attributes: ['name'] }]
        });

        if (user && user.isActive) {
            const roles = (user.roles || []).map(r => r.name);

            req.user = user;
            req.userId = user.id;
            req.userRoles = roles;
            req.userRole = roles.length ? roles[0] : null;
            req.isMasterAdmin = user.isMasterAdmin;
        }

        next();
    } catch (error) {
        // Ignorar errores de token en auth opcional
        next();
    }
};

module.exports = {
    authenticate,
    authorize,
    optionalAuth
};
