const suspensionService = require('../services/suspensionService');
const { asyncHandler } = require('../middlewares/errorHandler');
const { createAuditLog } = require('../middlewares/auditLog');

const createSuspension = asyncHandler(async (req, res) => {
    const suspension = await suspensionService.createSuspension(req.body, req.userId);

    await createAuditLog(req.userId, 'create_suspension', 'Suspension', suspension.id, {
        inspectorId: suspension.inspectorId,
        reason: suspension.reason,
        gravityLevel: suspension.gravityLevel
    });

    res.status(201).json({
        success: true,
        message: 'Suspension creada exitosamente',
        data: { suspension }
    });
});

const getAllSuspensions = asyncHandler(async (req, res) => {
    const filters = {
        status: req.query.status,
        inspectorId: req.query.inspectorId,
        page: req.query.page || 1,
        limit: req.query.limit || 20
    };

    const result = await suspensionService.getAllSuspensions(filters);

    res.json({
        success: true,
        data: result.suspensions,
        pagination: result.pagination
    });
});

const getSuspensionById = asyncHandler(async (req, res) => {
    const suspension = await suspensionService.getSuspensionById(req.params.id);

    res.json({
        success: true,
        data: { suspension }
    });
});

const liftSuspension = asyncHandler(async (req, res) => {
    const suspension = await suspensionService.liftSuspension(req.params.id);

    await createAuditLog(req.userId, 'lift_suspension', 'Suspension', suspension.id);

    res.json({
        success: true,
        message: 'Suspension levantada exitosamente',
        data: { suspension }
    });
});

const getSuspendedInspectors = asyncHandler(async (req, res) => {
    const suspensions = await suspensionService.getSuspendedInspectors();

    res.json({
        success: true,
        data: { suspensions }
    });
});

module.exports = {
    createSuspension,
    getAllSuspensions,
    getSuspensionById,
    liftSuspension,
    getSuspendedInspectors
};
