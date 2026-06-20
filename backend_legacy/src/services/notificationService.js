const { prisma } = require('../lib/databases');
const { AppError } = require('../middlewares/errorHandler');

class NotificationService {
    async getNotifications(userId, { page = 1, limit = 20 } = {}) {
        const safeLimit = Math.max(1, Math.min(Number(limit) || 20, 100));
        const safePage = Math.max(1, Number(page) || 1);
        const skip = (safePage - 1) * safeLimit;

        const [notifications, total] = await Promise.all([
            prisma.notificaciones.notification.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
                take: safeLimit,
                skip
            }),
            prisma.notificaciones.notification.count({ where: { userId } })
        ]);

        return {
            notifications,
            pagination: {
                total,
                page: safePage,
                limit: safeLimit,
                totalPages: Math.ceil(total / safeLimit)
            }
        };
    }

    async getUnreadCount(userId) {
        return prisma.notificaciones.notification.count({
            where: { userId, readAt: null }
        });
    }

    async markAsRead(notificationId, userId) {
        const notification = await prisma.notificaciones.notification.findFirst({
            where: { id: notificationId, userId }
        });

        if (!notification) {
            throw new AppError('Notificación no encontrada', 404, 'NOTIFICATION_NOT_FOUND');
        }

        return prisma.notificaciones.notification.update({
            where: { id: notificationId },
            data: { readAt: notification.readAt || new Date() }
        });
    }

    async markAllAsRead(userId) {
        await prisma.notificaciones.notification.updateMany({
            where: { userId, readAt: null },
            data: { readAt: new Date() }
        });
    }

    async createForUser(userId, payload) {
        return prisma.notificaciones.notification.create({
            data: {
                userId,
                inspectionId: payload.inspectionId || null,
                type: payload.type,
                title: payload.title,
                message: payload.message
            }
        });
    }

    async createForUsers(userIds, payload) {
        const uniqueUserIds = [...new Set(userIds.filter(Boolean))];
        if (!uniqueUserIds.length) return [];

        return prisma.notificaciones.notification.createMany({
            data: uniqueUserIds.map((userId) => ({
                userId,
                inspectionId: payload.inspectionId || null,
                type: payload.type,
                title: payload.title,
                message: payload.message
            }))
        });
    }

    async createForRoles(roleNames, payload, excludeUserIds = []) {
        const roleRecords = await prisma.auth.role.findMany({
            where: { name: { in: roleNames } },
            select: { id: true }
        });

        const roleIds = roleRecords.map(r => r.id);

        if (roleIds.length === 0) return [];

        const userRoles = await prisma.auth.userRole.findMany({
            where: { roleId: { in: roleIds } },
            select: { userId: true }
        });

        const userIds = [...new Set(userRoles.map(ur => ur.userId))]
            .filter(id => !excludeUserIds.includes(id));

        return this.createForUsers(userIds, payload);
    }
}

module.exports = new NotificationService();
