const { User, Role } = require('../models');
const { AppError } = require('../middlewares/errorHandler');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * Servicio de gestión de usuarios
 * Capa de lógica de negocio separada de controladores
 */
class UserService {
    /**
     * Formatea un usuario con roles y rol principal
     */
    _formatUser(user) {
        const u = user.toJSON();
        const roles = (u.roles || []).map((r) => r.name);
        return {
            ...u,
            roles,
            role: roles.length ? roles[0] : null
        };
    }

    /**
     * Obtener todos los usuarios con filtros
     */
    async getAllUsers(filters = {}) {
        const { role, isActive, search, page = 1, limit = 10 } = filters;

        const where = {};

        if (typeof isActive === 'boolean') where.isActive = isActive;
        if (search) {
            where[Op.or] = [
                { fullName: { [Op.iLike]: `%${search}%` } },
                { email: { [Op.iLike]: `%${search}%` } }
            ];
        }

        const include = [
            {
                model: Role,
                as: 'roles',
                attributes: ['name']
            }
        ];

        if (role) {
            include[0].where = { name: role };
        }

        const offset = (page - 1) * limit;

        const { count, rows } = await User.findAndCountAll({
            where,
            include,
            limit: parseInt(limit),
            offset: parseInt(offset),
            order: [['createdAt', 'DESC']],
            attributes: { exclude: ['passwordHash', '_plainPassword'] }
        });

        const formatted = rows.map((u) => this._formatUser(u));

        return {
            users: formatted,
            pagination: {
                total: count,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(count / limit)
            }
        };
    }

    /**
     * Obtener inspectores activos para asignacion
     */
    async getInspectors() {
        const users = await User.findAll({
            where: { isActive: true },
            include: [
                {
                    model: Role,
                    as: 'roles',
                    where: { name: 'inspector' },
                    attributes: ['name']
                }
            ],
            order: [['fullName', 'ASC']],
            attributes: { exclude: ['passwordHash', '_plainPassword'] }
        });

        return users.map((user) => this._formatUser(user));
    }

    /**
     * Obtener usuario por ID
     */
    async getUserById(userId) {
        const user = await User.findByPk(userId, {
            include: [{ model: Role, as: 'roles', attributes: ['name'] }],
            attributes: { exclude: ['passwordHash', '_plainPassword'] }
        });

        if (!user) {
            throw new AppError('Usuario no encontrado', 404, 'USER_NOT_FOUND');
        }

        return this._formatUser(user);
    }

    /**
     * Crear nuevo usuario
     */
    async createUser(userData, creatorId) {
        const { email, password, firstName, lastName, role, phone } = userData;

        // Verificar si el email ya existe
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            throw new AppError('El email ya está registrado', 409, 'DUPLICATE_EMAIL');
        }

        // Crear usuario (no permitimos establecer isMasterAdmin desde el request)
        const user = await User.create({
            email,
            password,
            fullName: `${firstName || ''} ${lastName || ''}`.trim(),
            phone
        });

        // Asignar rol (si se provee) o inspector por defecto
        const roleName = role || 'inspector';
        const roleModel = await Role.findOne({ where: { name: roleName } });
        if (!roleModel) {
            throw new AppError(`Rol inválido: ${roleName}`, 400, 'INVALID_ROLE');
        }

        await user.addRole(roleModel, { through: { assignedBy: creatorId } });

        // Reload with roles to return a normalized payload
        await user.reload({
            include: [{ model: Role, as: 'roles', attributes: ['name'] }]
        });

        return this._formatUser(user);
    }

    /**
     * Actualizar usuario
     */
    async updateUser(userId, updateData, updaterId) {
        const user = await User.findByPk(userId, {
            include: [{ model: Role, as: 'roles', attributes: ['name'] }]
        });

        if (!user) {
            throw new AppError('Usuario no encontrado', 404, 'USER_NOT_FOUND');
        }

        const { firstName, lastName, phone, role } = updateData;

        // Actualizar campos permitidos
        if (firstName !== undefined || lastName !== undefined) {
            const currentFull = user.fullName || '';
            const currentParts = currentFull.split(' ');
            const newFirst = firstName !== undefined ? firstName : currentParts[0];
            const newLast = lastName !== undefined ? lastName : currentParts.slice(1).join(' ');
            user.fullName = `${newFirst || ''} ${newLast || ''}`.trim();
        }
        if (phone !== undefined) user.phone = phone;

        // Solo admin puede cambiar roles (no se permite cambiar isMasterAdmin aquí)
        if (role !== undefined) {
            const roleModel = await Role.findOne({ where: { name: role } });
            if (!roleModel) {
                throw new AppError(`Rol inválido: ${role}`, 400, 'INVALID_ROLE');
            }
            await user.setRoles([roleModel], { through: { assignedBy: updaterId } });
        }

        await user.save();

        await user.reload({
            include: [{ model: Role, as: 'roles', attributes: ['name'] }]
        });

        return this._formatUser(user);
    }

    /**
     * Transferir el master admin a otro usuario
     */
    async transferMasterAdmin(actorUserId, newMasterUserId) {
        const actor = await User.findByPk(actorUserId);
        if (!actor || !actor.isMasterAdmin) {
            throw new AppError('No tienes permiso para transferir el master admin', 403, 'FORBIDDEN');
        }

        if (actorUserId === newMasterUserId) {
            throw new AppError('El nuevo master admin debe ser diferente al actual', 400, 'INVALID_REQUEST');
        }

        const newMaster = await User.findByPk(newMasterUserId);
        if (!newMaster) {
            throw new AppError('Usuario destino no encontrado', 404, 'USER_NOT_FOUND');
        }

        // Transacción para garantizar unicidad
        await sequelize.transaction(async (t) => {
            // Remover flag del master admin actual
            await User.update(
                { isMasterAdmin: false },
                { where: { isMasterAdmin: true }, transaction: t }
            );

            // Establecer nuevo master admin
            newMaster.isMasterAdmin = true;
            await newMaster.save({ transaction: t });
        });

        await newMaster.reload({
            include: [{ model: Role, as: 'roles', attributes: ['name'] }]
        });

        return this._formatUser(newMaster);
    }

    /**
     * Cambiar estado de usuario (activar/desactivar)
     */
    async toggleUserStatus(userId, isActive) {
        const user = await User.findByPk(userId);

        if (!user) {
            throw new AppError('Usuario no encontrado', 404, 'USER_NOT_FOUND');
        }

        if (user.isMasterAdmin && !isActive) {
            throw new AppError('No se puede desactivar al master admin', 403, 'FORBIDDEN');
        }

        user.isActive = isActive;
        await user.save();

        await user.reload({
            include: [{ model: Role, as: 'roles', attributes: ['name'] }]
        });

        return this._formatUser(user);
    }

    /**
     * Eliminar usuario (soft delete marcando como inactivo)
     */
    async deleteUser(userId) {
        const user = await User.findByPk(userId);

        if (!user) {
            throw new AppError('Usuario no encontrado', 404, 'USER_NOT_FOUND');
        }

        if (user.isMasterAdmin) {
            throw new AppError('No se puede eliminar al master admin', 403, 'FORBIDDEN');
        }

        // Soft delete - marcar como inactivo
        user.isActive = false;
        await user.save();

        await user.reload({
            include: [{ model: Role, as: 'roles', attributes: ['name'] }]
        });

        return this._formatUser(user);
    }

    /**
     * Obtener estadísticas de usuarios
     */
    async getUserStats() {
        try {
            const users = await User.findAll({
                attributes: ['id', 'isActive'],
                include: [
                    {
                        model: Role,
                        as: 'roles',
                        attributes: ['name'],
                        through: { attributes: [] },
                        required: false
                    }
                ]
            });

            const stats = {
                total: 0,
                active: 0,
                inactive: 0,
                activos: 0,
                admins: 0,
                arquitectos: 0,
                inspectores: 0,
                byRole: [
                    { role: 'admin', count: 0 },
                    { role: 'arquitecto', count: 0 },
                    { role: 'inspector', count: 0 }
                ]
            };

            users.forEach((user) => {
                stats.total += 1;

                if (user.isActive) {
                    stats.active += 1;
                    stats.activos += 1;
                } else {
                    stats.inactive += 1;
                }

                const roleNames = new Set((user.roles || []).map((role) => role.name));

                if (roleNames.has('admin')) {
                    stats.admins += 1;
                }

                if (roleNames.has('arquitecto')) {
                    stats.arquitectos += 1;
                }

                if (roleNames.has('inspector')) {
                    stats.inspectores += 1;
                }
            });

            stats.byRole = [
                { role: 'admin', count: stats.admins },
                { role: 'arquitecto', count: stats.arquitectos },
                { role: 'inspector', count: stats.inspectores }
            ];

            return stats;
        } catch (error) {
            console.log(error);
            throw new AppError('Error en la base de datos', 500, 'DATABASE_ERROR');
        }
    }
}

module.exports = new UserService();
