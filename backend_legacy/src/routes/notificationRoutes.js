const express = require('express');
const { authenticate } = require('../middlewares/auth');
const { internalAuth } = require('../middlewares/internalAuth');
const notificationController = require('../controllers/notificationController');
const notificationService = require('../services/notificationService');
const { prisma } = require('../lib/databases');

const router = express.Router();

router.use(internalAuth);
router.use(authenticate);

router.get('/', notificationController.getNotifications);
router.get('/unread-count', notificationController.getUnreadCount);
router.put('/read-all', notificationController.markAllAsRead);
router.put('/:id/read', notificationController.markAsRead);

router.post('/push-token', async (req, res) => {
    const { token, platform } = req.body;

    if (!token || !platform) {
        return res.status(400).json({
            success: false,
            error: { code: 'MISSING_FIELDS', message: 'token y platform son requeridos' }
        });
    }

    if (!['ios', 'android'].includes(platform)) {
        return res.status(400).json({
            success: false,
            error: { code: 'INVALID_PLATFORM', message: 'platform debe ser ios o android' }
        });
    }

    await notificationService.registerPushToken(req.userId, token, platform);

    res.json({
        success: true,
        message: 'Push token registrado exitosamente'
    });
});

router.delete('/push-token', async (req, res) => {
    const { token } = req.body;

    if (!token) {
        return res.status(400).json({
            success: false,
            error: { code: 'MISSING_FIELDS', message: 'token es requerido' }
        });
    }

    await notificationService.removePushToken(token);

    res.json({
        success: true,
        message: 'Push token eliminado exitosamente'
    });
});

router.post('/internal/reminder', async (req, res) => {
    const { userId, inspectionId } = req.body;

    if (!userId || !inspectionId) {
        return res.status(400).json({
            success: false,
            error: { code: 'MISSING_FIELDS', message: 'userId e inspectionId son requeridos' }
        });
    }

    const inspection = await prisma.inspecciones.inspection.findUnique({
        where: { id: inspectionId }
    });

    if (!inspection) {
        return res.status(404).json({
            success: false,
            error: { code: 'INSPECTION_NOT_FOUND', message: 'Inspeccion no encontrada' }
        });
    }

    const scheduled = new Date(inspection.scheduledDate);
    const now = new Date();
    const diffMin = Math.round((scheduled - now) / 60000);

    await notificationService.createForUser(userId, {
        inspectionId,
        type: 'inspection_reminder_30min',
        title: 'Recordatorio de inspeccion',
        message: `Tu inspeccion del proyecto ${inspection.projectName} comienza en ${diffMin} minutos. Asegurate de estar en el lugar.`,
        priority: 'high',
        category: 'inspection',
        metadata: {
            scheduledDate: inspection.scheduledDate,
            minutesRemaining: diffMin
        }
    });

    res.json({
        success: true,
        message: 'Notificacion de recordatorio creada'
    });
});

router.post('/internal/bulk', async (req, res) => {
    const { userIds, type, title, message, inspectionId, priority, category, metadata } = req.body;

    if (!userIds || !Array.isArray(userIds) || !type || !title || !message) {
        return res.status(400).json({
            success: false,
            error: { code: 'MISSING_FIELDS', message: 'userIds, type, title y message son requeridos' }
        });
    }

    await notificationService.createForUsers(userIds, {
        inspectionId,
        type,
        title,
        message,
        priority: priority || 'normal',
        category: category || 'inspection',
        metadata
    });

    res.json({
        success: true,
        message: `${userIds.length} notificaciones creadas`
    });
});

module.exports = router;
