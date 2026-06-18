const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middlewares/auth');
const evaluationController = require('../controllers/evaluationController');
const validateJoi = require('../middlewares/validateJoi');
const { createEvaluationSchema, updateEvaluationSchema } = require('../validators/evaluationValidator');

router.use(authenticate);

// GET /api/v1/evaluations/ranking/inspectors - Ranking inspectores
router.get('/ranking/inspectors', authorize('supervisor', 'admin'), evaluationController.getInspectorRanking);

// GET /api/v1/evaluations/ranking/architects - Ranking arquitectos
router.get('/ranking/architects', authorize('supervisor', 'admin'), evaluationController.getArchitectRanking);

// POST /api/v1/evaluations/bulk - Generar evaluaciones masivas
router.post('/bulk', authorize('supervisor'), evaluationController.generateBulkEvaluations);

// GET /api/v1/evaluations - Listar evaluaciones
router.get('/', authorize('supervisor', 'admin'), evaluationController.getAllEvaluations);

// GET /api/v1/evaluations/:id - Obtener evaluacion por ID
router.get('/:id', authorize('supervisor', 'admin'), evaluationController.getEvaluationById);

// POST /api/v1/evaluations - Crear evaluacion
router.post('/', authorize('supervisor'), validateJoi(createEvaluationSchema), evaluationController.createEvaluation);

// PUT /api/v1/evaluations/:id - Actualizar evaluacion
router.put('/:id', authorize('supervisor'), validateJoi(updateEvaluationSchema), evaluationController.updateEvaluation);

module.exports = router;
