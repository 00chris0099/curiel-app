const inspectionExecutionService = require('../services/inspectionExecutionService');
const { asyncHandler, AppError } = require('../middlewares/errorHandler');
const { createAuditLog } = require('../middlewares/auditLog');
const {
    areaCreateSchema,
    areaUpdateSchema,
    observationCreateSchema,
    observationUpdateSchema,
    photoCreateSchema,
    summaryUpdateSchema,
    completeInspectionSchema,
    validateExecutionPayload
} = require('../validators/inspectionExecutionValidator');

const getInspectionExecution = asyncHandler(async (req, res) => {
    const data = await inspectionExecutionService.getExecutionData(
        req.params.id,
        req.userId,
        req.userRole,
        req.isMasterAdmin
    );

    res.json({
        success: true,
        data
    });
});

const createDefaultAreas = asyncHandler(async (req, res) => {
    const result = await inspectionExecutionService.createDefaultAreas(
        req.params.id,
        req.userId,
        req.userRole,
        req.isMasterAdmin
    );

    await createAuditLog(req.userId, 'create_default_inspection_areas', 'Inspection', req.params.id, {
        createdCount: result.createdCount
    });

    res.status(201).json({
        success: true,
        message: result.createdCount > 0 ? 'Áreas por defecto creadas exitosamente' : 'Las áreas por defecto ya estaban registradas',
        data: result
    });
});

const createArea = asyncHandler(async (req, res) => {
    const payload = validateExecutionPayload(areaCreateSchema, req.body);
    const result = await inspectionExecutionService.createArea(
        req.params.id,
        payload,
        req.userId,
        req.userRole,
        req.isMasterAdmin
    );

    await createAuditLog(req.userId, 'create_inspection_area', 'InspectionArea', result.area.id, payload);

    res.status(201).json({
        success: true,
        message: 'Área creada exitosamente',
        data: result
    });
});

const updateArea = asyncHandler(async (req, res) => {
    const payload = validateExecutionPayload(areaUpdateSchema, req.body);
    const result = await inspectionExecutionService.updateArea(
        req.params.id,
        req.params.areaId,
        payload,
        req.userId,
        req.userRole,
        req.isMasterAdmin
    );

    await createAuditLog(req.userId, 'update_inspection_area', 'InspectionArea', req.params.areaId, payload);

    res.json({
        success: true,
        message: 'Área actualizada exitosamente',
        data: result
    });
});

const deleteArea = asyncHandler(async (req, res) => {
    const result = await inspectionExecutionService.deleteArea(
        req.params.id,
        req.params.areaId,
        req.userId,
        req.userRole,
        req.isMasterAdmin
    );

    await createAuditLog(req.userId, 'delete_inspection_area', 'InspectionArea', req.params.areaId);

    res.json({
        success: true,
        message: 'Área eliminada exitosamente',
        data: result
    });
});

const createObservation = asyncHandler(async (req, res) => {
    const payload = validateExecutionPayload(observationCreateSchema, req.body);
    const result = await inspectionExecutionService.createObservation(
        req.params.id,
        payload,
        req.userId,
        req.userRole,
        req.isMasterAdmin
    );

    await createAuditLog(req.userId, 'create_inspection_observation', 'InspectionObservation', result.observation.id, payload);

    res.status(201).json({
        success: true,
        message: 'Observación técnica creada exitosamente',
        data: result
    });
});

const updateObservation = asyncHandler(async (req, res) => {
    const payload = validateExecutionPayload(observationUpdateSchema, req.body);
    const result = await inspectionExecutionService.updateObservation(
        req.params.id,
        req.params.observationId,
        payload,
        req.userId,
        req.userRole,
        req.isMasterAdmin
    );

    await createAuditLog(req.userId, 'update_inspection_observation', 'InspectionObservation', req.params.observationId, payload);

    res.json({
        success: true,
        message: 'Observación técnica actualizada exitosamente',
        data: result
    });
});

const deleteObservation = asyncHandler(async (req, res) => {
    const result = await inspectionExecutionService.deleteObservation(
        req.params.id,
        req.params.observationId,
        req.userId,
        req.userRole,
        req.isMasterAdmin
    );

    await createAuditLog(req.userId, 'delete_inspection_observation', 'InspectionObservation', req.params.observationId);

    res.json({
        success: true,
        message: 'Observación técnica eliminada exitosamente',
        data: result
    });
});

const createPhoto = asyncHandler(async (req, res) => {
    if (!req.file && !req.body?.url) {
        throw new AppError('No se recibió archivo', 400, 'NO_FILE');
    }

    const payload = validateExecutionPayload(photoCreateSchema, req.body);
    const result = await inspectionExecutionService.createPhoto(
        req.params.id,
        payload,
        req.file,
        req.userId,
        req.userRole,
        req.isMasterAdmin
    );

    await createAuditLog(req.userId, 'create_execution_photo', 'Photo', result.photo.id, {
        type: payload.type,
        areaId: payload.areaId,
        observationId: payload.observationId
    });

    res.status(201).json({
        success: true,
        message: 'Foto registrada exitosamente',
        data: result
    });
});

const updateSummary = asyncHandler(async (req, res) => {
    const payload = validateExecutionPayload(summaryUpdateSchema, req.body);
    const summary = await inspectionExecutionService.updateSummary(
        req.params.id,
        payload,
        req.userId,
        req.userRole,
        req.isMasterAdmin
    );

    await createAuditLog(req.userId, 'update_inspection_summary', 'InspectionSummary', summary.id, payload);

    res.json({
        success: true,
        message: 'Resumen técnico actualizado exitosamente',
        data: { summary }
    });
});

const completeInspection = asyncHandler(async (req, res) => {
    const payload = validateExecutionPayload(completeInspectionSchema, req.body || {});
    const result = await inspectionExecutionService.completeInspection(
        req.params.id,
        payload,
        req.userId,
        req.userRole,
        req.isMasterAdmin
    );

    await createAuditLog(req.userId, 'complete_inspection_execution', 'Inspection', req.params.id, payload);

    res.json({
        success: true,
        message: 'Inspección finalizada y enviada a revisión',
        data: result
    });
});

module.exports = {
    getInspectionExecution,
    createDefaultAreas,
    createArea,
    updateArea,
    deleteArea,
    createObservation,
    updateObservation,
    deleteObservation,
    createPhoto,
    updateSummary,
    completeInspection
};
