const evaluationService = require('../services/evaluationService');
const { asyncHandler } = require('../middlewares/errorHandler');
const { createAuditLog } = require('../middlewares/auditLog');

const createEvaluation = asyncHandler(async (req, res) => {
    const evaluation = await evaluationService.generateWeeklyEvaluation(
        req.body.evaluatedUserId,
        req.body.weekStart,
        req.body.weekEnd,
        req.userId
    );

    await createAuditLog(req.userId, 'create_evaluation', 'Evaluation', evaluation.id, {
        evaluatedUserId: evaluation.evaluatedUserId,
        weekStart: evaluation.weekStart,
        weekEnd: evaluation.weekEnd
    });

    res.status(201).json({
        success: true,
        message: 'Evaluacion creada exitosamente',
        data: { evaluation }
    });
});

const getAllEvaluations = asyncHandler(async (req, res) => {
    const filters = {
        evaluatedUserId: req.query.evaluatedUserId,
        supervisorId: req.query.supervisorId,
        status: req.query.status,
        page: req.query.page || 1,
        limit: req.query.limit || 20
    };

    const result = await evaluationService.getAllEvaluations(filters);

    res.json({
        success: true,
        data: result.evaluations,
        pagination: result.pagination
    });
});

const getEvaluationById = asyncHandler(async (req, res) => {
    const evaluation = await evaluationService.getEvaluationById(req.params.id);

    res.json({
        success: true,
        data: { evaluation }
    });
});

const updateEvaluation = asyncHandler(async (req, res) => {
    const evaluation = await evaluationService.updateEvaluation(req.params.id, req.body);

    await createAuditLog(req.userId, 'update_evaluation', 'Evaluation', evaluation.id, {
        changes: req.body
    });

    res.json({
        success: true,
        message: 'Evaluacion actualizada exitosamente',
        data: { evaluation }
    });
});

const generateBulkEvaluations = asyncHandler(async (req, res) => {
    const { weekStart, weekEnd } = req.body;

    const results = await evaluationService.generateBulkWeeklyEvaluations(
        weekStart,
        weekEnd,
        req.userId
    );

    await createAuditLog(req.userId, 'generate_bulk_evaluations', 'Evaluation', null, {
        weekStart,
        weekEnd,
        totalGenerated: results.filter(r => r.success).length
    });

    res.status(201).json({
        success: true,
        message: 'Evaluaciones generadas exitosamente',
        data: { results }
    });
});

const getInspectorRanking = asyncHandler(async (req, res) => {
    const { weekStart, weekEnd } = req.query;

    const ranking = await evaluationService.getInspectorRanking(weekStart, weekEnd);

    res.json({
        success: true,
        data: { ranking }
    });
});

const getArchitectRanking = asyncHandler(async (req, res) => {
    const { weekStart, weekEnd } = req.query;

    const ranking = await evaluationService.getArchitectRanking(weekStart, weekEnd);

    res.json({
        success: true,
        data: { ranking }
    });
});

module.exports = {
    createEvaluation,
    getAllEvaluations,
    getEvaluationById,
    updateEvaluation,
    generateBulkEvaluations,
    getInspectorRanking,
    getArchitectRanking
};
