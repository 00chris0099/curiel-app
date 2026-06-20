const { prisma } = require('../lib/databases');
const { AppError } = require('../middlewares/errorHandler');
const bcrypt = require('bcryptjs');
const logger = require('../utils/logger');

const SELECT_USER_SAFE = {
    id: true,
    fullName: true,
    email: true,
    phone: true,
    isActive: true,
    isMasterAdmin: true,
    createdBy: true,
    createdAt: true,
    updatedAt: true
};

class UserService {
    _formatUser(user, roles) {
        const roleNames = (roles || []).map(r => r.role.name);
        return {
            ...user,
            roles: roleNames,
            role: roleNames.length ? roleNames[0] : null
        };
    }

    async getAllUsers(filters = {}) {
        const { role, isActive, search, page = 1, limit = 10 } = filters;

        const where = {};
        if (typeof isActive === 'boolean') where.isActive = isActive;
        if (search) {
            where.OR = [
                { fullName: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } }
            ];
        }

        const userRoleWhere = role ? { role: { name: role } } : {};

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [users, total] = await Promise.all([
            prisma.auth.user.findMany({
                where,
                select: {
                    ...SELECT_USER_SAFE,
                    roles: {
                        where: userRoleWhere,
                        select: { role: { select: { name: true } } }
                    }
                },
                orderBy: { createdAt: 'desc' },
                take: parseInt(limit),
                skip
            }),
            prisma.auth.user.count({ where })
        ]);

        const formatted = users.map(u => this._formatUser(u, u.roles));

        return {
            users: formatted,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    async getInspectors() {
        const users = await prisma.auth.user.findMany({
            where: { isActive: true },
            select: {
                ...SELECT_USER_SAFE,
                roles: {
                    where: { role: { name: 'inspector' } },
                    select: { role: { select: { name: true } } }
                }
            },
            orderBy: { fullName: 'asc' }
        });

        return users
            .filter(u => u.roles.length > 0)
            .map(u => this._formatUser(u, u.roles));
    }

    async getUserById(userId) {
        const user = await prisma.auth.user.findUnique({
            where: { id: userId },
            select: {
                ...SELECT_USER_SAFE,
                roles: {
                    select: { role: { select: { name: true } } }
                }
            }
        });

        if (!user) {
            throw new AppError('Usuario no encontrado', 404, 'USER_NOT_FOUND');
        }

        return this._formatUser(user, user.roles);
    }

    async createUser(userData, creatorId) {
        const { email, password, fullName, firstName, lastName, role, phone } = userData;

        const normalizedEmail = email?.trim().toLowerCase();
        const normalizedFullName = (fullName || `${firstName || ''} ${lastName || ''}`).trim();

        if (!normalizedEmail) {
            throw new AppError('El email es requerido', 400, 'INVALID_EMAIL');
        }
        if (!password) {
            throw new AppError('La contraseña es requerida', 400, 'MISSING_PASSWORD');
        }
        if (!normalizedFullName) {
            throw new AppError('El nombre completo es requerido', 400, 'MISSING_FULL_NAME');
        }

        const existingUser = await prisma.auth.user.findUnique({
            where: { email: normalizedEmail }
        });
        if (existingUser) {
            throw new AppError('El email ya está registrado', 409, 'DUPLICATE_EMAIL');
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const roleName = role || 'inspector';

        const roleModel = await prisma.auth.role.findUnique({
            where: { name: roleName }
        });
        if (!roleModel) {
            throw new AppError(`Rol inválido: ${roleName}`, 400, 'INVALID_ROLE');
        }

        const user = await prisma.auth.user.create({
            data: {
                email: normalizedEmail,
                fullName: normalizedFullName,
                phone,
                passwordHash,
                createdBy: creatorId || null,
                roles: {
                    create: {
                        roleId: roleModel.id,
                        assignedBy: creatorId
                    }
                }
            },
            select: {
                ...SELECT_USER_SAFE,
                roles: {
                    select: { role: { select: { name: true } } }
                }
            }
        });

        return this._formatUser(user, user.roles);
    }

    async updateUser(userId, updateData, updaterId) {
        const user = await prisma.auth.user.findUnique({
            where: { id: userId },
            select: {
                ...SELECT_USER_SAFE,
                fullName: true,
                roles: {
                    select: { role: { select: { name: true } } }
                }
            }
        });

        if (!user) {
            throw new AppError('Usuario no encontrado', 404, 'USER_NOT_FOUND');
        }

        const { firstName, lastName, phone, role } = updateData;

        const updateFields = {};
        if (firstName !== undefined || lastName !== undefined) {
            const currentParts = (user.fullName || '').split(' ');
            const newFirst = firstName !== undefined ? firstName : currentParts[0];
            const newLast = lastName !== undefined ? lastName : currentParts.slice(1).join(' ');
            updateFields.fullName = `${newFirst || ''} ${newLast || ''}`.trim();
        }
        if (phone !== undefined) updateFields.phone = phone;

        if (Object.keys(updateFields).length > 0) {
            await prisma.auth.user.update({
                where: { id: userId },
                data: updateFields
            });
        }

        if (role !== undefined) {
            const roleModel = await prisma.auth.role.findUnique({
                where: { name: role }
            });
            if (!roleModel) {
                throw new AppError(`Rol inválido: ${role}`, 400, 'INVALID_ROLE');
            }

            await prisma.auth.userRole.deleteMany({ where: { userId } });
            await prisma.auth.userRole.create({
                data: {
                    userId,
                    roleId: roleModel.id,
                    assignedBy: updaterId
                }
            });
        }

        return this.getUserById(userId);
    }

    async transferMasterAdmin(actorUserId, newMasterUserId) {
        const actor = await prisma.auth.user.findUnique({
            where: { id: actorUserId }
        });
        if (!actor || !actor.isMasterAdmin) {
            throw new AppError('No tienes permiso para transferir el master admin', 403, 'FORBIDDEN');
        }

        if (actorUserId === newMasterUserId) {
            throw new AppError('El nuevo master admin debe ser diferente al actual', 400, 'INVALID_REQUEST');
        }

        const newMaster = await prisma.auth.user.findUnique({
            where: { id: newMasterUserId }
        });
        if (!newMaster) {
            throw new AppError('Usuario destino no encontrado', 404, 'USER_NOT_FOUND');
        }

        await prisma.auth.$transaction([
            prisma.auth.user.updateMany({
                where: { isMasterAdmin: true },
                data: { isMasterAdmin: false }
            }),
            prisma.auth.user.update({
                where: { id: newMasterUserId },
                data: { isMasterAdmin: true }
            })
        ]);

        return this.getUserById(newMasterUserId);
    }

    async toggleUserStatus(userId, isActive) {
        const user = await prisma.auth.user.findUnique({
            where: { id: userId }
        });

        if (!user) {
            throw new AppError('Usuario no encontrado', 404, 'USER_NOT_FOUND');
        }

        if (user.isMasterAdmin && !isActive) {
            throw new AppError('No se puede desactivar al master admin', 403, 'FORBIDDEN');
        }

        await prisma.auth.user.update({
            where: { id: userId },
            data: { isActive }
        });

        return this.getUserById(userId);
    }

    async deleteUser(userId) {
        const user = await prisma.auth.user.findUnique({
            where: { id: userId }
        });

        if (!user) {
            throw new AppError('Usuario no encontrado', 404, 'USER_NOT_FOUND');
        }

        if (user.isMasterAdmin) {
            throw new AppError('No se puede eliminar al master admin', 403, 'FORBIDDEN');
        }

        await prisma.auth.user.update({
            where: { id: userId },
            data: { isActive: false }
        });

        return this.getUserById(userId);
    }

    async getUserStats() {
        try {
            const users = await prisma.auth.user.findMany({
                select: {
                    id: true,
                    isActive: true,
                    roles: {
                        select: { role: { select: { name: true } } }
                    }
                }
            });

            const stats = {
                total: users.length,
                active: 0,
                inactive: 0,
                activos: 0,
                admins: 0,
                supervisores: 0,
                arquitectos: 0,
                inspectores: 0,
                byRole: []
            };

            for (const user of users) {
                if (user.isActive) {
                    stats.active += 1;
                    stats.activos += 1;
                } else {
                    stats.inactive += 1;
                }

                const roleNames = new Set(user.roles.map(r => r.role.name));
                if (roleNames.has('admin')) stats.admins += 1;
                if (roleNames.has('supervisor')) stats.supervisores += 1;
                if (roleNames.has('arquitecto')) stats.arquitectos += 1;
                if (roleNames.has('inspector')) stats.inspectores += 1;
            }

            stats.byRole = [
                { role: 'admin', count: stats.admins },
                { role: 'supervisor', count: stats.supervisores },
                { role: 'arquitecto', count: stats.arquitectos },
                { role: 'inspector', count: stats.inspectores }
            ];

            return stats;
        } catch (error) {
            logger.error('Error en base de datos', { error: error.message });
            throw new AppError('Error en la base de datos', 500, 'DATABASE_ERROR');
        }
    }
}

module.exports = new UserService();
