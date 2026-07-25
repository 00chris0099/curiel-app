const pdfDraftService = require('../services/pdfDraftService');
const pdfVersionService = require('../services/pdfVersionService');
const { asyncHandler } = require('../middlewares/errorHandler');
const { createAuditLog } = require('../middlewares/auditLog');

const getDraft = asyncHandler(async (req, res) => {
    const draft = await pdfDraftService.getDraft(req.params.id);
    res.json({
        success: true,
        message: draft ? 'Borrador encontrado' : 'No hay borrador',
        data: { draft: draft || null }
    });
});

const saveDraft = asyncHandler(async (req, res) => {
    const { snapshotJson } = req.body;
    const draft = await pdfDraftService.saveDraft(req.params.id, snapshotJson, req.userId);
    await createAuditLog(req.userId, 'save_pdf_draft', 'PdfDraft', draft.id, {
        inspectionId: req.params.id
    });
    res.json({
        success: true,
        message: 'Borrador guardado exitosamente',
        data: { draft }
    });
});

const getVersions = asyncHandler(async (req, res) => {
    const versions = await pdfVersionService.getVersions(req.params.id);
    res.json({
        success: true,
        message: 'Versiones obtenidas exitosamente',
        data: { versions }
    });
});

const createVersion = asyncHandler(async (req, res) => {
    const { snapshotJson, description } = req.body;
    const version = await pdfVersionService.createVersion(
        req.params.id,
        snapshotJson,
        req.userId,
        description
    );
    await createAuditLog(req.userId, 'create_pdf_version', 'PdfVersion', version.id, {
        inspectionId: req.params.id,
        versionNumber: version.versionNumber
    });
    res.status(201).json({
        success: true,
        message: 'Versión creada exitosamente',
        data: { version }
    });
});

const restoreVersion = asyncHandler(async (req, res) => {
    const snapshot = await pdfVersionService.restoreVersion(req.params.id, req.params.version);
    res.json({
        success: true,
        message: 'Versión restaurada exitosamente',
        data: { snapshot }
    });
});

module.exports = {
    getDraft,
    saveDraft,
    getVersions,
    createVersion,
    restoreVersion
};
