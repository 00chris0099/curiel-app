const pdfTemplateService = require('../services/pdfTemplateService');
const { asyncHandler } = require('../middlewares/errorHandler');
const { createAuditLog } = require('../middlewares/auditLog');

const getAllTemplates = asyncHandler(async (req, res) => {
    const filters = {
        category: req.query.category,
        search: req.query.search,
        page: req.query.page || 1,
        limit: req.query.limit || 20
    };
    const result = await pdfTemplateService.getAllTemplates(filters);
    res.json({
        success: true,
        message: 'Plantillas obtenidas exitosamente',
        data: result.templates,
        pagination: result.pagination
    });
});

const getTemplateById = asyncHandler(async (req, res) => {
    const template = await pdfTemplateService.getTemplateById(req.params.id);
    res.json({
        success: true,
        message: 'Plantilla obtenida exitosamente',
        data: { template }
    });
});

const createTemplate = asyncHandler(async (req, res) => {
    const template = await pdfTemplateService.createTemplate(req.body, req.userId);
    await createAuditLog(req.userId, 'create_pdf_template', 'PdfTemplate', template.id, {
        name: template.name,
        category: template.category
    });
    res.status(201).json({
        success: true,
        message: 'Plantilla creada exitosamente',
        data: { template }
    });
});

const updateTemplate = asyncHandler(async (req, res) => {
    const template = await pdfTemplateService.updateTemplate(
        req.params.id,
        req.body,
        req.userId,
        req.isMasterAdmin
    );
    await createAuditLog(req.userId, 'update_pdf_template', 'PdfTemplate', template.id, {
        name: template.name
    });
    res.json({
        success: true,
        message: 'Plantilla actualizada exitosamente',
        data: { template }
    });
});

const deleteTemplate = asyncHandler(async (req, res) => {
    await pdfTemplateService.deleteTemplate(req.params.id, req.userId, req.isMasterAdmin);
    await createAuditLog(req.userId, 'delete_pdf_template', 'PdfTemplate', req.params.id, {});
    res.json({
        success: true,
        message: 'Plantilla eliminada exitosamente'
    });
});

module.exports = {
    getAllTemplates,
    getTemplateById,
    createTemplate,
    updateTemplate,
    deleteTemplate
};
