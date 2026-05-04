const jwt = require('jsonwebtoken');
const { User, Role } = require('../models');
const config = require('../config');
const { createAuditLog } = require('../middlewares/auditLog');

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
 * Generar JWT token
 */
const generateToken = (payload) => {
    return jwt.sign(payload, config.jwt.secret, {
        expiresIn: config.jwt.expiresIn
    });
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

        // Actualizar último login
        user.lastLogin = new Date();
        await user.save();

        const roles = (user.roles || []).map(r => r.name);

        // Generar token (incluye roles + master flag)
        const token = generateToken({
            userId: user.id,
            email: user.email,
            isMasterAdmin: user.isMasterAdmin,
            roles
        });

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
                token
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

        // Audit log
        await createAuditLog(req.userId, 'register', 'User', user.id, {
            email: user.email,
            role: roleName
        });

        res.status(201).json({
            success: true,
            message: 'Usuario creado exitosamente',
            data: { user: formatUser(user) }
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

        await createAuditLog(req.user.id, 'change_password', 'User', user.id);

        res.json({
            success: true,
            message: 'Contraseña actualizada exitosamente'
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
    changePassword
};
