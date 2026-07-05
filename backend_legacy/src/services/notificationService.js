const { prisma } = require('../lib/databases');
const { AppError } = require('../middlewares/errorHandler');
const { triggerN8nWebhook } = require('../utils/n8n');
const notificationPreferenceService = require('./notificationPreferenceService');
const logger = require('../utils/logger');

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
                message: payload.message,
                channel: payload.channel || 'in_app',
                priority: payload.priority || 'normal',
                category: payload.category || 'system',
                metadata: payload.metadata || undefined
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
                message: payload.message,
                channel: payload.channel || 'in_app',
                priority: payload.priority || 'normal',
                category: payload.category || 'system',
                metadata: payload.metadata || undefined
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

    async createAndNotify(userId, payload) {
        const notification = await this.createForUser(userId, payload);

        const category = payload.category || 'system';

        if (payload.sendEmail) {
            const canEmail = await notificationPreferenceService.shouldNotify(userId, category, 'email');
            if (canEmail) {
                const user = await prisma.auth.user.findUnique({
                    where: { id: userId },
                    select: { email: true, fullName: true }
                });

                if (user) {
                    triggerN8nWebhook('userNotification', {
                        channel: 'email',
                        type: payload.type,
                        inspectionId: payload.inspectionId,
                        inspectionStatus: payload.metadata?.inspectionStatus,
                        recipient: {
                            id: userId,
                            email: user.email,
                            fullName: user.fullName
                        },
                        notificationTitle: payload.title,
                        notificationMessage: payload.message
                    });

                    await prisma.notificaciones.notification.update({
                        where: { id: notification.id },
                        data: { sentAt: new Date() }
                    });
                }
            }
        }

        if (payload.sendPush) {
            const canPush = await notificationPreferenceService.shouldNotify(userId, category, 'push');
            if (canPush) {
                const pushTokens = await prisma.notificaciones.pushToken.findMany({
                    where: { userId, isActive: true }
                });

                for (const pt of pushTokens) {
                    triggerN8nWebhook('pushNotification', {
                        token: pt.token,
                        platform: pt.platform,
                        title: payload.title,
                        body: payload.message,
                        data: {
                            type: payload.type,
                            inspectionId: payload.inspectionId
                        }
                    });
                }
            }
        }

        return notification;
    }

    async createAndNotifyForUsers(userIds, payload) {
        const uniqueUserIds = [...new Set(userIds.filter(Boolean))];
        if (!uniqueUserIds.length) return [];

        const result = await this.createForUsers(uniqueUserIds, payload);

        const category = payload.category || 'system';

        for (const userId of uniqueUserIds) {
            if (payload.sendEmail) {
                const canEmail = await notificationPreferenceService.shouldNotify(userId, category, 'email');
                if (canEmail) {
                    const user = await prisma.auth.user.findUnique({
                        where: { id: userId },
                        select: { email: true, fullName: true }
                    });

                    if (user) {
                        triggerN8nWebhook('userNotification', {
                            channel: 'email',
                            type: payload.type,
                            inspectionId: payload.inspectionId,
                            inspectionStatus: payload.metadata?.inspectionStatus,
                            recipient: {
                                id: userId,
                                email: user.email,
                                fullName: user.fullName
                            },
                            notificationTitle: payload.title,
                            notificationMessage: payload.message
                        });
                    }
                }
            }
        }

        await prisma.notificaciones.notification.updateMany({
            where: {
                userId: { in: uniqueUserIds },
                type: payload.type,
                inspectionId: payload.inspectionId || undefined,
                sentAt: null
            },
            data: { sentAt: new Date() }
        });

        return result;
    }

    async createAndNotifyForRoles(roleNames, payload, excludeUserIds = []) {
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

        return this.createAndNotifyForUsers(userIds, payload);
    }

    async registerPushToken(userId, token, platform) {
        const existing = await prisma.notificaciones.pushToken.findUnique({
            where: { token }
        });

        if (existing) {
            return prisma.notificaciones.pushToken.update({
                where: { token },
                data: { isActive: true, userId }
            });
        }

        return prisma.notificaciones.pushToken.create({
            data: { userId, token, platform }
        });
    }

    async removePushToken(token) {
        return prisma.notificaciones.pushToken.updateMany({
            where: { token },
            data: { isActive: false }
        });
    }
}

module.exports = new NotificationService();
