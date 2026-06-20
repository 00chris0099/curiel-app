const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { prisma } = require('../lib/databases');
const config = require('../config');
const { createAuditLog } = require('../middlewares/auditLog');
const { sendEmail } = require('../services/emailService');
const { welcomeEmail, passwordResetEmail } = require('../utils/emailTemplates');

const formatUser = (user, roles) => {
    const roleNames = (roles || []).map(r => r.role?.name || r.name);
    return {
        ...user,
        roles: roleNames,
        role: roleNames.length ? roleNames[0] : null
    };
};

const generateAccessToken = (payload) => {
    return jwt.sign(payload, config.jwt.secret, { expiresIn: '15m' });
};

const generateRefreshTokenJWT = (payload) => {
    return jwt.sign(payload, config.jwt.secret, {
        expiresIn: config.jwt.refreshExpiresIn || '30d'
    });
};

const parseExpiresIn = (expiresIn) => {
    if (typeof expiresIn === 'number') return expiresIn * 1000;
    const match = String(expiresIn).match(/^(\d+)([smhd])$/);
    if (!match) return 30 * 24 * 60 * 60 * 1000;
    const [, val, unit] = match;
    const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
    return parseInt(val) * multipliers[unit];
};

const generateToken = () => crypto.randomBytes(32).toString('hex');

const createRefreshToken = async (userId, req) => {
    const refreshExpiresIn = config.jwt.refreshExpiresIn || '30d';
    const expiresAt = new Date(Date.now() + parseExpiresIn(refreshExpiresIn));

    const refreshToken = await prisma.auth.refreshToken.create({
        data: {
            token: generateToken(),
            userId,
            expiresAt,
            ipAddress: req.ip || req.connection?.remoteAddress,
            userAgent: req.headers['user-agent']
        }
    });

    return refreshToken;
};

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

const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        const user = await prisma.auth.user.findUnique({
            where: { email },
            include: {
                roles: { select: { role: { select: { name: true } } } }
            }
        });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Credenciales inválidas'
            });
        }

        const isMatch = await bcrypt.compare(password, user.passwordHash);

        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Credenciales inválidas'
            });
        }

        if (!user.isActive) {
            return res.status(403).json({
                success: false,
                message: 'Usuario desactivado'
            });
        }

        const roles = (user.roles || []).map(r => r.role.name);

        const { accessToken, refreshToken } = await generateTokenPair(user, roles, req);

        await createAuditLog(user.id, 'login', 'User', user.id);

        const responseUser = {
            id: user.id,
            fullName: user.fullName,
            email: user.email,
            phone: user.phone,
            isActive: user.isActive,
            isMasterAdmin: user.isMasterAdmin,
            createdBy: user.createdBy,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
            roles,
            role: roles.length ? roles[0] : null
        };

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

const register = async (req, res, next) => {
    try {
        const { email, password, firstName, lastName, role, phone } = req.body;

        const existingUser = await prisma.auth.user.findUnique({
            where: { email }
        });
        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: 'El email ya está registrado'
            });
        }

        const roleName = role || 'inspector';
        const roleModel = await prisma.auth.role.findUnique({
            where: { name: roleName }
        });
        if (!roleModel) {
            return res.status(400).json({
                success: false,
                message: `Rol inválido: ${roleName}`
            });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const fullName = `${firstName || ''} ${lastName || ''}`.trim();

        const user = await prisma.auth.user.create({
            data: {
                email,
                passwordHash,
                fullName,
                phone,
                createdBy: req.userId,
                roles: {
                    create: {
                        roleId: roleModel.id,
                        assignedBy: req.userId
                    }
                }
            },
            include: {
                roles: { select: { role: { select: { name: true } } } }
            }
        });

        const roles = user.roles.map(r => r.role.name);

        const { accessToken, refreshToken } = await generateTokenPair(user, roles, req);

        await createAuditLog(req.userId, 'register', 'User', user.id, {
            email: user.email,
            role: roleName
        });

        try {
            const { subject, html } = welcomeEmail(user, password);
            await sendEmail({ to: user.email, subject, html });
        } catch (emailError) {
            const logger = require('../utils/logger');
            logger.error('Error sending welcome email', { error: emailError.message });
        }

        res.status(201).json({
            success: true,
            message: 'Usuario creado exitosamente',
            data: {
                user: formatUser(user, user.roles),
                token: accessToken,
                refreshToken
            }
        });
    } catch (error) {
        next(error);
    }
};

const getMe = async (req, res, next) => {
    try {
        const user = await prisma.auth.user.findUnique({
            where: { id: req.userId },
            include: {
                roles: { select: { role: { select: { name: true } } } }
            }
        });

        res.json({
            success: true,
            data: formatUser(user, user.roles)
        });
    } catch (error) {
        next(error);
    }
};

const updateProfile = async (req, res, next) => {
    try {
        const { firstName, lastName, phone } = req.body;

        const user = await prisma.auth.user.findUnique({
            where: { id: req.userId }
        });

        const data = {};
        if (firstName || lastName) {
            const currentParts = (user.fullName || '').split(' ');
            const newFirst = firstName || currentParts[0];
            const newLast = lastName || currentParts.slice(1).join(' ');
            data.fullName = `${newFirst || ''} ${newLast || ''}`.trim();
        }
        if (phone) data.phone = phone;

        if (Object.keys(data).length > 0) {
            await prisma.auth.user.update({
                where: { id: req.userId },
                data
            });
        }

        await createAuditLog(req.userId, 'update_profile', 'User', req.userId);

        const updatedUser = await prisma.auth.user.findUnique({
            where: { id: req.userId },
            include: {
                roles: { select: { role: { select: { name: true } } } }
            }
        });

        res.json({
            success: true,
            message: 'Perfil actualizado',
            data: formatUser(updatedUser, updatedUser.roles)
        });
    } catch (error) {
        next(error);
    }
};

const changePassword = async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body;

        const user = await prisma.auth.user.findUnique({
            where: { id: req.userId }
        });

        const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);

        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Contraseña actual incorrecta'
            });
        }

        const passwordHash = await bcrypt.hash(newPassword, 10);
        await prisma.auth.user.update({
            where: { id: req.userId },
            data: { passwordHash }
        });

        await createAuditLog(req.userId, 'change_password', 'User', req.userId);

        res.json({
            success: true,
            message: 'Contraseña actualizada exitosamente'
        });
    } catch (error) {
        next(error);
    }
};

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

        const storedToken = await prisma.auth.refreshToken.findUnique({
            where: { token },
            include: {
                user: {
                    include: {
                        roles: { select: { role: { select: { name: true } } } }
                    }
                }
            }
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

        if (storedToken.revokedAt) {
            await prisma.auth.refreshToken.deleteMany({
                where: { userId: storedToken.userId }
            });
            return res.status(401).json({
                success: false,
                error: {
                    code: 'REFRESH_TOKEN_REUSE',
                    message: 'Refresh token comprometido. Sesion cerrada por seguridad.'
                }
            });
        }

        if (new Date() > storedToken.expiresAt) {
            await prisma.auth.refreshToken.update({
                where: { id: storedToken.id },
                data: { revokedAt: new Date() }
            });
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
            await prisma.auth.refreshToken.update({
                where: { id: storedToken.id },
                data: { revokedAt: new Date() }
            });
            return res.status(401).json({
                success: false,
                error: {
                    code: 'USER_INACTIVE',
                    message: 'Usuario inactivo'
                }
            });
        }

        const roles = user.roles.map(r => r.role.name);

        const newRefreshToken = await createRefreshToken(user.id, req);
        await prisma.auth.refreshToken.update({
            where: { id: storedToken.id },
            data: {
                revokedAt: new Date(),
                replacedByToken: newRefreshToken.token
            }
        });

        const accessToken = generateAccessToken({
            userId: user.id,
            email: user.email,
            isMasterAdmin: user.isMasterAdmin,
            roles
        });

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

const logout = async (req, res, next) => {
    try {
        const { refreshToken: token } = req.body;

        if (token) {
            const storedToken = await prisma.auth.refreshToken.findUnique({
                where: { token }
            });
            if (storedToken) {
                await prisma.auth.refreshToken.update({
                    where: { id: storedToken.id },
                    data: { revokedAt: new Date() }
                });
            }
        }

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

const forgotPassword = async (req, res, next) => {
    try {
        const { email } = req.body;

        const user = await prisma.auth.user.findUnique({
            where: { email }
        });

        if (!user) {
            return res.json({
                success: true,
                message: 'Si el email esta registrado, recibiras un enlace para restablecer tu contrasena.'
            });
        }

        await prisma.auth.passwordResetToken.updateMany({
            where: { userId: user.id, usedAt: null },
            data: { usedAt: new Date() }
        });

        const resetToken = generateToken();
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

        await prisma.auth.passwordResetToken.create({
            data: {
                userId: user.id,
                token: resetToken,
                expiresAt
            }
        });

        const resetUrl = `${config.urls.frontend}/reset-password?token=${resetToken}`;
        const { subject, html } = passwordResetEmail(user, resetUrl);

        await sendEmail({ to: user.email, subject, html });

        await createAuditLog(user.id, 'forgot_password', 'User', user.id);

        res.json({
            success: true,
            message: 'Si el email esta registrado, recibiras un enlace para restablecer tu contrasena.'
        });
    } catch (error) {
        next(error);
    }
};

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

        const resetTokenRecord = await prisma.auth.passwordResetToken.findFirst({
            where: { token, usedAt: null }
        });

        if (!resetTokenRecord) {
            return res.status(400).json({
                success: false,
                message: 'Token invalido o ya utilizado'
            });
        }

        if (new Date() > resetTokenRecord.expiresAt) {
            return res.status(400).json({
                success: false,
                message: 'El token ha expirado. Solicita uno nuevo.'
            });
        }

        const user = await prisma.auth.user.findUnique({
            where: { id: resetTokenRecord.userId }
        });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        const passwordHash = await bcrypt.hash(newPassword, 10);
        await prisma.auth.user.update({
            where: { id: user.id },
            data: { passwordHash }
        });

        await prisma.auth.passwordResetToken.update({
            where: { id: resetTokenRecord.id },
            data: { usedAt: new Date() }
        });

        await prisma.auth.refreshToken.deleteMany({
            where: { userId: user.id }
        });

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
