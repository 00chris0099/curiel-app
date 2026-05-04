const { Notification, User, Role } = require('../models');
const { Op } = require('sequelize');
const { ensureNotificationInfra } = require('../utils/notificationInfra');
const { AppError } = require('../middlewares/errorHandler');

const safeUserAttributes = {
    exclude: ['passwordHash', '_plainPassword']
};

class NotificationService {
    async getNotifications(userId, { page = 1, limit = 20 } = {}) {
        await ensureNotificationInfra();

        const safeLimit = Math.max(1, Math.min(Number(limit) || 20, 100));
        const safePage = Math.max(1, Number(page) || 1);
        const offset = (safePage - 1) * safeLimit;

        const { rows, count } = await Notification.findAndCountAll({
            where: { userId },
            order: [['createdAt', 'DESC']],
            limit: safeLimit,
            offset
        });

        return {
            notifications: rows,
            pagination: {
                total: count,
                page: safePage,
                limit: safeLimit,
                totalPages: Math.ceil(count / safeLimit)
            }
        };
    }

    async getUnreadCount(userId) {
        await ensureNotificationInfra();
        return Notification.count({
            where: {
                userId,
                readAt: null
            }
        });
    }

    async markAsRead(notificationId, userId) {
        await ensureNotificationInfra();
        const notification = await Notification.findOne({ where: { id: notificationId, userId } });

        if (!notification) {
            throw new AppError('Notificación no encontrada', 404, 'NOTIFICATION_NOT_FOUND');
        }

        notification.readAt = notification.readAt || new Date();
        await notification.save();
        return notification;
    }

    async markAllAsRead(userId) {
        await ensureNotificationInfra();
        await Notification.update(
            { readAt: new Date() },
            {
                where: {
                    userId,
                    readAt: null
                }
            }
        );
    }

    async createForUser(userId, payload) {
        await ensureNotificationInfra();

        return Notification.create({
            userId,
            inspectionId: payload.inspectionId || null,
            type: payload.type,
            title: payload.title,
            message: payload.message,
            readAt: null
        });
    }

    async createForUsers(userIds, payload) {
        await ensureNotificationInfra();

        const uniqueUserIds = [...new Set(userIds.filter(Boolean))];
        if (!uniqueUserIds.length) {
            return [];
        }

        const rows = uniqueUserIds.map((userId) => ({
            userId,
            inspectionId: payload.inspectionId || null,
            type: payload.type,
            title: payload.title,
            message: payload.message,
            readAt: null
        }));

        return Notification.bulkCreate(rows);
    }

    async createForRoles(roleNames, payload, excludeUserIds = []) {
        const users = await User.findAll({
            attributes: safeUserAttributes,
            include: [
                {
                    model: Role,
                    as: 'roles',
                    attributes: ['name'],
                    where: {
                        name: {
                            [Op.in]: roleNames
                        }
                    },
                    through: { attributes: [] },
                    required: true
                }
            ]
        });

        const userIds = users
            .map((user) => user.id)
            .filter((userId) => !excludeUserIds.includes(userId));

        return this.createForUsers(userIds, payload);
    }
}

module.exports = new NotificationService();
