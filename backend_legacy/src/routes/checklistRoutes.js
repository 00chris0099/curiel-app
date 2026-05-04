const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middlewares/auth');
const checklistController = require('../controllers/checklistController');

// Todas las rutas requieren autenticación
router.use(authenticate);

// ============================================
// TEMPLATES
// ============================================

// GET /api/v1/checklists/templates - Listar templates
router.get('/templates', checklistController.getAllTemplates);

// GET /api/v1/checklists/templates/:id - Obtener template por ID
router.get('/templates/:id', checklistController.getTemplateById);

// POST /api/v1/checklists/templates - Crear template (admin/arquitecto)
router.post(
    '/templates',
    authorize('admin', 'arquitecto'),
    checklistController.createTemplate
);

// PUT /api/v1/checklists/templates/:id - Actualizar template (admin/arquitecto)
router.put(
    '/templates/:id',
    authorize('admin', 'arquitecto'),
    checklistController.updateTemplate
);

// DELETE /api/v1/checklists/templates/:id - Eliminar template (solo admin)
router.delete(
    '/templates/:id',
    authorize('admin'),
    checklistController.deleteTemplate
);

// ============================================
// ITEMS
// ============================================

// POST /api/v1/checklists/templates/:id/items - Agregar item al template (admin/arquitecto)
router.post(
    '/templates/:id/items',
    authorize('admin', 'arquitecto'),
    checklistController.addItemToTemplate
);

// PUT /api/v1/checklists/items/:itemId - Actualizar item (admin/arquitecto)
router.put(
    '/items/:itemId',
    authorize('admin', 'arquitecto'),
    checklistController.updateTemplateItem
);

// DELETE /api/v1/checklists/items/:itemId - Eliminar item (admin/arquitecto)
router.delete(
    '/items/:itemId',
    authorize('admin', 'arquitecto'),
    checklistController.deleteTemplateItem
);

module.exports = router;
