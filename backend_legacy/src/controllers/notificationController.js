const notificationService = require('../services/notificationService');
const { asyncHandler } = require('../middlewares/errorHandler');

const getNotifications = asyncHandler(async (req, res) => {
    const result = await notificationService.getNotifications(req.userId, {
        page: req.query.page,
        limit: req.query.limit
    });

    res.json({
        success: true,
        data: result.notifications,
        pagination: result.pagination
    });
});

const getUnreadCount = asyncHandler(async (req, res) => {
    const count = await notificationService.getUnreadCount(req.userId);

    res.json({
        success: true,
        data: { unreadCount: count }
    });
});

const markAsRead = asyncHandler(async (req, res) => {
    const notification = await notificationService.markAsRead(req.params.id, req.userId);

    res.json({
        success: true,
        data: notification
    });
});

const markAllAsRead = asyncHandler(async (req, res) => {
    await notificationService.markAllAsRead(req.userId);

    res.json({
        success: true,
        message: 'Notificaciones marcadas como leídas'
    });
});

module.exports = {
    getNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead
};
