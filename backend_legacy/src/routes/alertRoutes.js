const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middlewares/auth');
const alertController = require('../controllers/alertController');
const validateJoi = require('../middlewares/validateJoi');
const { createAlertSchema, updateAlertSchema } = require('../validators/alertValidator');

router.use(authenticate);

// GET /api/v1/alerts/level/:level - Alertas por nivel de gravedad (debe ir antes de /:id)
router.get('/level/:level', authorize('supervisor', 'admin'), alertController.getOpenAlertsByGravity);

// GET /api/v1/alerts - Listar alertas
router.get('/', authorize('supervisor', 'admin'), alertController.getAllAlerts);

// GET /api/v1/alerts/:id - Obtener alerta por ID
router.get('/:id', authorize('supervisor', 'admin'), alertController.getAlertById);

// POST /api/v1/alerts - Crear alerta (solo supervisor)
router.post('/', authorize('supervisor'), validateJoi(createAlertSchema), alertController.createAlert);

// PUT /api/v1/alerts/:id - Actualizar alerta
router.put('/:id', authorize('supervisor', 'admin'), validateJoi(updateAlertSchema), alertController.updateAlert);

module.exports = router;
