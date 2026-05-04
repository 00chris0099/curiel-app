const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middlewares/auth');
const inspectionController = require('../controllers/inspectionController');
const inspectionExecutionRoutes = require('./inspectionExecutionRoutes');
const inspectionReportController = require('../controllers/inspectionReportController');

// Todas las rutas requieren autenticación
router.use(authenticate);

// GET /api/v1/inspections/stats - Estadísticas
router.get('/stats', inspectionController.getInspectionStats);

// GET /api/v1/inspections - Listar inspecciones
router.get('/', inspectionController.getAllInspections);

// POST /api/v1/inspections - Crear inspección (admin/arquitecto)
router.post(
    '/',
    authorize('admin', 'arquitecto'),
    inspectionController.createInspection
);

// GET /api/v1/inspections/:id/report - Generar informe PDF profesional
router.get('/:id/report', inspectionReportController.downloadInspectionReport);

// GET /api/v1/inspections/:id - Obtener inspección por ID
router.get('/:id', inspectionController.getInspectionById);

// /api/v1/inspections/:id/execution - Módulo de ejecución técnica
router.use('/:id/execution', inspectionExecutionRoutes);

// PUT /api/v1/inspections/:id - Actualizar inspección
router.put('/:id', inspectionController.updateInspection);

// PATCH /api/v1/inspections/:id/status - Cambiar estado
router.patch('/:id/status', inspectionController.updateInspectionStatus);

// DELETE /api/v1/inspections/:id - Eliminar inspección (solo admin)
router.delete(
    '/:id',
    authorize('admin'),
    inspectionController.deleteInspection
);

module.exports = router;
