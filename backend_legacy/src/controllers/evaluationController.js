const evaluationService = require('../services/evaluationService');
const { asyncHandler } = require('../middlewares/errorHandler');
const { createAuditLog } = require('../middlewares/auditLog');
const { triggerN8nWebhook } = require('../utils/n8n');
const { sendEmail } = require('../services/emailService');
const { evaluationEmail } = require('../utils/emailTemplates');
const { User } = require('../models');
const logger = require('../utils/logger');

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

    triggerN8nWebhook('evaluationNotification', {
        event: 'evaluation_created',
        evaluation: {
            id: evaluation.id,
            evaluatedUserId: evaluation.evaluatedUserId,
            weekStart: evaluation.weekStart,
            weekEnd: evaluation.weekEnd,
            compositeScore: evaluation.compositeScore
        }
    });

    // Enviar email de evaluacion al evaluado
    try {
        const evaluatedUser = await User.findByPk(evaluation.evaluatedUserId);
        if (evaluatedUser) {
            const { subject, html } = evaluationEmail(evaluatedUser, {
                score: evaluation.compositeScore,
                weekStart: evaluation.weekStart,
                weekEnd: evaluation.weekEnd,
                comment: evaluation.comment
            });
            await sendEmail({ to: evaluatedUser.email, subject, html });
        }
    } catch (emailError) {
        logger.error('Error sending evaluation email', { error: emailError.message });
    }

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

    const successfulCount = results.filter(r => r.success).length;
    if (successfulCount > 0) {
        triggerN8nWebhook('evaluationNotification', {
            event: 'bulk_evaluations_generated',
            weekStart,
            weekEnd,
            totalGenerated: successfulCount,
            supervisorId: req.userId
        });
    }

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

const getDashboardKPIs = asyncHandler(async (req, res) => {
    const kpis = await evaluationService.getDashboardKPIs();

    res.json({
        success: true,
        data: { kpis }
    });
});

module.exports = {
    createEvaluation,
    getAllEvaluations,
    getEvaluationById,
    updateEvaluation,
    generateBulkEvaluations,
    getInspectorRanking,
    getArchitectRanking,
    getDashboardKPIs
};
