const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middlewares/auth');
const { internalAuth } = require('../middlewares/internalAuth');
const validateJoi = require('../middlewares/validateJoi');
const {
    createInspectionSchema,
    updateInspectionSchema,
    updateStatusSchema
} = require('../validators/inspectionValidator');
const {
    requireInspectionAccess,
    requireInspectionEditAccess,
    requireInspectionStatusAccess,
    requireInspectionReportAccess,
} = require('../middlewares/inspectionPermissions');
const inspectionController = require('../controllers/inspectionController');
const inspectionExecutionRoutes = require('./inspectionExecutionRoutes');
const inspectionReportController = require('../controllers/inspectionReportController');

// Internal API key (n8n cron jobs) o JWT auth
router.use(internalAuth);
router.use(authenticate);

// GET /api/v1/inspections/stats - Estadisticas
router.get('/stats', inspectionController.getInspectionStats);

// GET /api/v1/inspections - Listar inspecciones
router.get('/', inspectionController.getAllInspections);

// POST /api/v1/inspections - Crear inspeccion (admin/arquitecto/supervisor)
router.post(
    '/',
    authorize('admin', 'arquitecto', 'supervisor'),
    validateJoi(createInspectionSchema),
    inspectionController.createInspection
);

// GET /api/v1/inspections/:id/report - Generar informe PDF profesional
router.get(
    '/:id/report',
    authorize('admin', 'arquitecto', 'supervisor', 'inspector'),
    requireInspectionReportAccess,
    inspectionReportController.downloadInspectionReport
);

// GET /api/v1/inspections/:id - Obtener inspeccion por ID
router.get(
    '/:id',
    authorize('admin', 'arquitecto', 'supervisor', 'inspector'),
    requireInspectionAccess,
    inspectionController.getInspectionById
);

// /api/v1/inspections/:id/execution - Modulo de ejecucion tecnica
router.use('/:id/execution', inspectionExecutionRoutes);

// PUT /api/v1/inspections/:id - Actualizar inspeccion
router.put(
    '/:id',
    authorize('admin', 'arquitecto', 'supervisor'),
    requireInspectionEditAccess,
    validateJoi(updateInspectionSchema),
    inspectionController.updateInspection
);

// PATCH /api/v1/inspections/:id/status - Cambiar estado
router.patch(
    '/:id/status',
    authorize('admin', 'arquitecto', 'supervisor', 'inspector'),
    requireInspectionStatusAccess,
    validateJoi(updateStatusSchema),
    inspectionController.updateInspectionStatus
);

// DELETE /api/v1/inspections/:id - Eliminar inspeccion (solo admin)
router.delete(
    '/:id',
    authorize('admin'),
    inspectionController.deleteInspection
);

module.exports = router;
