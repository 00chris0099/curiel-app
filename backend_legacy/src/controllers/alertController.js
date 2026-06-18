const alertService = require('../services/alertService');
const { asyncHandler } = require('../middlewares/errorHandler');
const { createAuditLog } = require('../middlewares/auditLog');

const createAlert = asyncHandler(async (req, res) => {
    const alert = await alertService.createAlert(req.body, req.userId);

    await createAuditLog(req.userId, 'create_alert', 'Alert', alert.id, {
        gravityLevel: alert.gravityLevel,
        title: alert.title
    });

    res.status(201).json({
        success: true,
        message: 'Alerta creada exitosamente',
        data: { alert }
    });
});

const getAllAlerts = asyncHandler(async (req, res) => {
    const filters = {
        status: req.query.status,
        gravityLevel: req.query.gravityLevel ? parseInt(req.query.gravityLevel) : undefined,
        page: req.query.page || 1,
        limit: req.query.limit || 20
    };

    const result = await alertService.getAllAlerts(filters);

    res.json({
        success: true,
        data: result.alerts,
        pagination: result.pagination
    });
});

const getAlertById = asyncHandler(async (req, res) => {
    const alert = await alertService.getAlertById(req.params.id);

    res.json({
        success: true,
        data: { alert }
    });
});

const updateAlert = asyncHandler(async (req, res) => {
    const alert = await alertService.updateAlert(req.params.id, req.body);

    await createAuditLog(req.userId, 'update_alert', 'Alert', alert.id, {
        changes: req.body
    });

    res.json({
        success: true,
        message: 'Alerta actualizada exitosamente',
        data: { alert }
    });
});

const getOpenAlertsByGravity = asyncHandler(async (req, res) => {
    const alerts = await alertService.getOpenAlertsByGravity(parseInt(req.params.level));

    res.json({
        success: true,
        data: { alerts }
    });
});

module.exports = {
    createAlert,
    getAllAlerts,
    getAlertById,
    updateAlert,
    getOpenAlertsByGravity
};
