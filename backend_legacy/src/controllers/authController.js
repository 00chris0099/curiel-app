const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { User, Role, RefreshToken, PasswordResetToken } = require('../models');
const config = require('../config');
const { createAuditLog } = require('../middlewares/auditLog');
const { sendEmail } = require('../services/emailService');
const { welcomeEmail, passwordResetEmail } = require('../utils/emailTemplates');

const formatUser = (user) => {
    const u = user.toJSON();
    const roles = (u.roles || []).map((r) => r.name);
    return {
        ...u,
        roles,
        role: roles.length ? roles[0] : null
    };
};

/**
 * Generar access token JWT (corta duracion: 15min)
 */
const generateAccessToken = (payload) => {
    return jwt.sign(payload, config.jwt.secret, {
        expiresIn: '15m'
    });
};

/**
 * Generar refresh token JWT (larga duracion: 30d)
 */
const generateRefreshTokenJWT = (payload) => {
    return jwt.sign(payload, config.jwt.secret, {
        expiresIn: config.jwt.refreshExpiresIn || '30d'
    });
};

/**
 * Parsear duracion de un JWT expiresIn a milisegundos
 */
const parseExpiresIn = (expiresIn) => {
    if (typeof expiresIn === 'number') return expiresIn * 1000;
    const match = String(expiresIn).match(/^(\d+)([smhd])$/);
    if (!match) return 30 * 24 * 60 * 60 * 1000;
    const [, val, unit] = match;
    const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
    return parseInt(val) * multipliers[unit];
};

/**
 * Crear refresh token en BD y revocar anteriores del mismo usuario
 */
const createRefreshToken = async (userId, req) => {
    const refreshExpiresIn = config.jwt.refreshExpiresIn || '30d';
    const expiresAt = new Date(Date.now() + parseExpiresIn(refreshExpiresIn));

    const refreshToken = await RefreshToken.create({
        token: RefreshToken.generateToken(),
        userId,
        expiresAt,
        ipAddress: req.ip || req.connection?.remoteAddress,
        userAgent: req.headers['user-agent']
    });

    return refreshToken;
};

/**
 * Generar ambos tokens + guardar refresh en BD
 */
const generateTokenPair = async (user, roles, req) => {
    const payload = {
        userId: user.id,
        email: user.email,
        isMasterAdmin: user.isMasterAdmin,
        roles
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = await createRefreshToken(user.id, req);

    return { accessToken, refreshToken: refreshToken.token };
};

/**
 * Login
 * POST /api/auth/login
 */
const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        // Buscar usuario con roles
        const user = await User.findOne({
            where: { email },
            include: [{ model: Role, as: 'roles', attributes: ['name'] }]
        });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Credenciales inválidas'
            });
        }

        // Verificar contraseña
        const isMatch = await user.comparePassword(password);

        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Credenciales inválidas'
            });
        }

        // Verificar si está activo
        if (!user.isActive) {
            return res.status(403).json({
                success: false,
                message: 'Usuario desactivado'
            });
        }

        // Actualizar ultimo login
        user.lastLogin = new Date();
        await user.save();

        const roles = (user.roles || []).map(r => r.name);

        // Generar access token + refresh token
        const { accessToken, refreshToken } = await generateTokenPair(user, roles, req);

        // Audit log
        await createAuditLog(user.id, 'login', 'User', user.id);

        const responseUser = user.toJSON();
        responseUser.roles = roles;
        responseUser.role = roles.length ? roles[0] : null;

        res.json({
            success: true,
            message: 'Login exitoso',
            data: {
                user: responseUser,
                token: accessToken,
                refreshToken
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Registro de nuevo usuario (solo Admin)
 * POST /api/auth/register
 */
const register = async (req, res, next) => {
    try {
        const { email, password, firstName, lastName, role, phone } = req.body;

        // Verificar si el usuario ya existe
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: 'El email ya está registrado'
            });
        }

        // Determinar rol y validar
        const roleName = role || 'inspector';
        const roleModel = await Role.findOne({ where: { name: roleName } });
        if (!roleModel) {
            return res.status(400).json({
                success: false,
                message: `Rol inválido: ${roleName}`
            });
        }

        // Crear usuario
        const user = await User.create({
            email,
            password,
            fullName: `${firstName || ''} ${lastName || ''}`.trim(),
            phone
        });

        // Asignar rol
        await user.addRole(roleModel, { through: { assignedBy: req.userId } });
        await user.reload({ include: [{ model: Role, as: 'roles', attributes: ['name'] }] });

        const roles = (user.roles || []).map(r => r.name);

        // Generar tokens
        const { accessToken, refreshToken } = await generateTokenPair(user, roles, req);

        // Audit log
        await createAuditLog(req.userId, 'register', 'User', user.id, {
            email: user.email,
            role: roleName
        });

        // Enviar email de bienvenida con contrasena temporal
        try {
            const { subject, html } = welcomeEmail(user, password);
            await sendEmail({ to: user.email, subject, html });
        } catch (emailError) {
            console.error('Error sending welcome email:', emailError.message);
        }

        res.status(201).json({
            success: true,
            message: 'Usuario creado exitosamente',
            data: {
                user: formatUser(user),
                token: accessToken,
                refreshToken
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Obtener perfil del usuario autenticado
 * GET /api/auth/me
 */
const getMe = async (req, res, next) => {
    try {
        const user = await User.findByPk(req.userId, {
            include: [{ model: Role, as: 'roles', attributes: ['name'] }]
        });

        res.json({
            success: true,
            // data es directamente el User para alinear con ProfileResponse del frontend
            data: formatUser(user)
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Actualizar perfil
 * PUT /api/auth/me
 */
const updateProfile = async (req, res, next) => {
    try {
        const { firstName, lastName, phone } = req.body;
        const user = await User.findByPk(req.userId);

        if (firstName) user.firstName = firstName;
        if (lastName) user.lastName = lastName;
        if (phone) user.phone = phone;

        await user.save();

        await createAuditLog(req.userId, 'update_profile', 'User', user.id);

        await user.reload({ include: [{ model: Role, as: 'roles', attributes: ['name'] }] });

        res.json({
            success: true,
            message: 'Perfil actualizado',
            // data es directamente el User para alinear con ProfileResponse del frontend
            data: formatUser(user)
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Cambiar contraseña
 * PUT /api/auth/change-password
 */
const changePassword = async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const user = await User.findByPk(req.userId);

        // Verificar contraseña actual
        const isMatch = await user.comparePassword(currentPassword);

        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Contraseña actual incorrecta'
            });
        }

        // Actualizar contraseña
        user.password = newPassword;
        await user.save();

        await createAuditLog(req.userId, 'change_password', 'User', user.id);

        res.json({
            success: true,
            message: 'Contraseña actualizada exitosamente'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Renovar access token usando refresh token
 * POST /api/auth/refresh
 */
const refreshToken = async (req, res, next) => {
    try {
        const { refreshToken: token } = req.body;

        if (!token) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'MISSING_REFRESH_TOKEN',
                    message: 'Refresh token requerido'
                }
            });
        }

        // Buscar refresh token en BD
        const storedToken = await RefreshToken.findOne({
            where: { token },
            include: [{ model: User, as: 'user', include: [{ model: Role, as: 'roles', attributes: ['name'] }] }]
        });

        if (!storedToken) {
            return res.status(401).json({
                success: false,
                error: {
                    code: 'INVALID_REFRESH_TOKEN',
                    message: 'Refresh token invalido'
                }
            });
        }

        // Verificar si esta revocado
        if (storedToken.isRevoked()) {
            // Posible uso de refresh token revocado → revocar todos los tokens del usuario
            await RefreshToken.destroy({ where: { userId: storedToken.userId } });
            return res.status(401).json({
                success: false,
                error: {
                    code: 'REFRESH_TOKEN_REUSE',
                    message: 'Refresh token comprometido. Sesion cerrada por seguridad.'
                }
            });
        }

        // Verificar si esta expirado
        if (storedToken.isExpired()) {
            await storedToken.revoke();
            return res.status(401).json({
                success: false,
                error: {
                    code: 'REFRESH_EXPIRED',
                    message: 'Refresh token expirado. Inicie sesion nuevamente.'
                }
            });
        }

        const user = storedToken.user;

        if (!user || !user.isActive) {
            await storedToken.revoke();
            return res.status(401).json({
                success: false,
                error: {
                    code: 'USER_INACTIVE',
                    message: 'Usuario inactivo'
                }
            });
        }

        const roles = (user.roles || []).map(r => r.name);

        // Revocar el refresh token actual (rotation)
        const newRefreshToken = await createRefreshToken(user.id, req);
        await storedToken.revoke(newRefreshToken.token);

        // Generar nuevo access token
        const accessToken = generateAccessToken({
            userId: user.id,
            email: user.email,
            isMasterAdmin: user.isMasterAdmin,
            roles
        });

        // Audit log
        await createAuditLog(user.id, 'refresh_token', 'User', user.id);

        res.json({
            success: true,
            message: 'Token renovado exitosamente',
            data: {
                token: accessToken,
                refreshToken: newRefreshToken.token
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Cerrar sesion (revocar refresh token)
 * POST /api/auth/logout
 */
const logout = async (req, res, next) => {
    try {
        const { refreshToken: token } = req.body;

        if (token) {
            // Revocar el refresh token especifico
            const storedToken = await RefreshToken.findOne({ where: { token } });
            if (storedToken) {
                await storedToken.revoke();
            }
        }

        // Audit log
        if (req.userId) {
            await createAuditLog(req.userId, 'logout', 'User', req.userId);
        }

        res.json({
            success: true,
            message: 'Sesion cerrada exitosamente'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Solicitar restablecimiento de contrasena
 * POST /api/auth/forgot-password
 */
const forgotPassword = async (req, res, next) => {
    try {
        const { email } = req.body;

        const user = await User.findOne({ where: { email } });

        // Siempre devolver success para no revelar si el email existe
        if (!user) {
            return res.json({
                success: true,
                message: 'Si el email esta registrado, recibiras un enlace para restablecer tu contrasena.'
            });
        }

        // Invalidar tokens anteriores del mismo usuario
        await PasswordResetToken.update(
            { usedAt: new Date() },
            { where: { userId: user.id, usedAt: null } }
        );

        // Crear nuevo token (1 hora de expiracion)
        const resetToken = PasswordResetToken.generateToken();
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

        await PasswordResetToken.create({
            userId: user.id,
            token: resetToken,
            expiresAt
        });

        // Enviar email
        const resetUrl = `${config.urls.frontend}/reset-password?token=${resetToken}`;
        const { subject, html } = passwordResetEmail(user, resetUrl);

        await sendEmail({
            to: user.email,
            subject,
            html
        });

        await createAuditLog(user.id, 'forgot_password', 'User', user.id);

        res.json({
            success: true,
            message: 'Si el email esta registrado, recibiras un enlace para restablecer tu contrasena.'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Restablecer contrasena con token
 * POST /api/auth/reset-password
 */
const resetPassword = async (req, res, next) => {
    try {
        const { token, newPassword } = req.body;

        if (!token || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Token y nueva contrasena son requeridos'
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'La contrasena debe tener al menos 6 caracteres'
            });
        }

        const resetTokenRecord = await PasswordResetToken.findOne({
            where: { token, usedAt: null }
        });

        if (!resetTokenRecord) {
            return res.status(400).json({
                success: false,
                message: 'Token invalido o ya utilizado'
            });
        }

        if (resetTokenRecord.isExpired()) {
            return res.status(400).json({
                success: false,
                message: 'El token ha expirado. Solicita uno nuevo.'
            });
        }

        // Actualizar contrasena
        const user = await User.findByPk(resetTokenRecord.userId);
        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        user.password = newPassword;
        await user.save();

        // Marcar token como usado
        resetTokenRecord.usedAt = new Date();
        await resetTokenRecord.save();

        // Revocar todos los refresh tokens del usuario
        await RefreshToken.destroy({ where: { userId: user.id } });

        await createAuditLog(user.id, 'reset_password', 'User', user.id);

        res.json({
            success: true,
            message: 'Contrasena restablecida exitosamente. Inicia sesion con tu nueva contrasena.'
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    login,
    register,
    getMe,
    updateProfile,
    changePassword,
    refreshToken,
    logout,
    forgotPassword,
    resetPassword
};
