const inspectionService = require('../services/inspectionService');
const { asyncHandler, AppError } = require('../middlewares/errorHandler');
const { createAuditLog } = require('../middlewares/auditLog');

/**
 * @desc    Obtener todas las inspecciones
 * @route   GET /api/v1/inspections
 * @access  Private
 */
const getAllInspections = asyncHandler(async (req, res) => {
    const filters = {
        status: req.query.status,
        inspectorId: req.query.inspectorId,
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        search: req.query.search,
        page: req.query.page || 1,
        limit: req.query.limit || 10
    };

    const result = await inspectionService.getAllInspections(filters, req.userId, req.userRole, req.isMasterAdmin);

    res.json({
        success: true,
        message: 'Inspecciones obtenidas exitosamente',
        data: result.inspections,
        pagination: result.pagination
    });
});

/**
 * @desc    Obtener inspección por ID
 * @route   GET /api/v1/inspections/:id
 * @access  Private
 */
const getInspectionById = asyncHandler(async (req, res) => {
    const inspection = await inspectionService.getInspectionById(req.params.id, req.userId, req.userRole, req.isMasterAdmin);

    res.json({
        success: true,
        data: inspection
    });
});

/**
 * @desc    Crear nueva inspección
 * @route   POST /api/v1/inspections
 * @access  Private/Admin/Arquitecto
 */
const createInspection = asyncHandler(async (req, res) => {
    const inspection = await inspectionService.createInspection(req.body, req.userId);

    await createAuditLog(req.userId, 'create_inspection', 'Inspection', inspection.id, {
        projectName: inspection.projectName,
        inspectorId: inspection.inspectorId
    });

    res.status(201).json({
        success: true,
        message: 'Inspección creada exitosamente',
        data: inspection
    });
});

/**
 * @desc    Actualizar inspección
 * @route   PUT /api/v1/inspections/:id
 * @access  Private
 */
const updateInspection = asyncHandler(async (req, res) => {
    const inspection = await inspectionService.updateInspection(
        req.params.id,
        req.body,
        req.userId,
        req.userRole,
        req.isMasterAdmin
    );

    await createAuditLog(req.userId, 'update_inspection', 'Inspection', inspection.id, {
        changes: req.body
    });

    res.json({
        success: true,
        message: 'Inspección actualizada exitosamente',
        data: inspection
    });
});

/**
 * @desc    Cambiar estado de inspección
 * @route   PATCH /api/v1/inspections/:id/status
 * @access  Private
 */
const updateInspectionStatus = asyncHandler(async (req, res) => {
    const { status } = req.body;

    if (!status) {
        throw new AppError('El campo status es requerido', 400, 'MISSING_STATUS');
    }

    const result = await inspectionService.updateInspectionStatus(
        req.params.id,
        status,
        req.userId,
        req.userRole,
        req.isMasterAdmin
    );

    await createAuditLog(req.userId, 'change_inspection_status', 'Inspection', result.inspection.id, {
        oldStatus: result.oldStatus,
        newStatus: result.newStatus
    });

    res.json({
        success: true,
        message: `Estado de inspección cambiado de "${result.oldStatus}" a "${result.newStatus}"`,
        data: result.inspection
    });
});

/**
 * @desc    Eliminar inspección
 * @route   DELETE /api/v1/inspections/:id
 * @access  Private/Admin
 */
const deleteInspection = asyncHandler(async (req, res) => {
    const inspection = await inspectionService.deleteInspection(req.params.id);

    await createAuditLog(req.userId, 'delete_inspection', 'Inspection', inspection.id, {
        projectName: inspection.projectName
    });

    res.json({
        success: true,
        message: 'Inspección eliminada exitosamente',
        data: inspection
    });
});

/**
 * @desc    Obtener estadísticas de inspecciones
 * @route   GET /api/v1/inspections/stats
 * @access  Private
 */
const getInspectionStats = asyncHandler(async (req, res) => {
    const stats = await inspectionService.getInspectionStats(req.userId, req.userRole, req.isMasterAdmin);

    res.json({
        success: true,
        data: stats
    });
});

module.exports = {
    getAllInspections,
    getInspectionById,
    createInspection,
    updateInspection,
    updateInspectionStatus,
    deleteInspection,
    getInspectionStats
};
