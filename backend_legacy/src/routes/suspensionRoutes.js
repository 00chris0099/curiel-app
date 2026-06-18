const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middlewares/auth');
const suspensionController = require('../controllers/suspensionController');
const validateJoi = require('../middlewares/validateJoi');
const { createSuspensionSchema, updateSuspensionSchema } = require('../validators/suspensionValidator');

router.use(authenticate);

// GET /api/v1/suspensions/suspended - Inspectores suspendidos (debe ir antes de /:id)
router.get('/suspended', authorize('supervisor', 'admin'), suspensionController.getSuspendedInspectors);

// GET /api/v1/suspensions - Listar suspensiones
router.get('/', authorize('supervisor', 'admin'), suspensionController.getAllSuspensions);

// GET /api/v1/suspensions/:id - Obtener suspension por ID
router.get('/:id', authorize('supervisor', 'admin'), suspensionController.getSuspensionById);

// POST /api/v1/suspensions - Crear suspension (solo supervisor)
router.post('/', authorize('supervisor'), validateJoi(createSuspensionSchema), suspensionController.createSuspension);

// PUT /api/v1/suspensions/:id/lift - Levantar suspension (solo admin)
router.put('/:id/lift', authorize('admin'), suspensionController.liftSuspension);

module.exports = router;
