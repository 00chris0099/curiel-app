const checklistService = require('../services/checklistService');
const { asyncHandler } = require('../middlewares/errorHandler');
const { createAuditLog } = require('../middlewares/auditLog');

/**
 * @desc    Obtener todos los templates de checklist
 * @route   GET /api/v1/checklists/templates
 * @access  Private
 */
const getAllTemplates = asyncHandler(async (req, res) => {
    const filters = {
        isActive: req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined,
        search: req.query.search
    };

    const templates = await checklistService.getAllTemplates(filters);

    res.json({
        success: true,
        message: 'Templates de checklist obtenidos exitosamente',
        data: { templates }
    });
});

/**
 * @desc    Obtener template por ID
 * @route   GET /api/v1/checklists/templates/:id
 * @access  Private
 */
const getTemplateById = asyncHandler(async (req, res) => {
    const template = await checklistService.getTemplateById(req.params.id);

    res.json({
        success: true,
        data: { template }
    });
});

/**
 * @desc    Crear nuevo template de checklist
 * @route   POST /api/v1/checklists/templates
 * @access  Private/Admin/Arquitecto
 */
const createTemplate = asyncHandler(async (req, res) => {
    const template = await checklistService.createTemplate(req.body, req.userId);

    await createAuditLog(req.userId, 'create_checklist_template', 'ChecklistTemplate', template.id, {
        name: template.name,
        inspectionType: template.inspectionType
    });

    res.status(201).json({
        success: true,
        message: 'Template de checklist creado exitosamente',
        data: { template }
    });
});

/**
 * @desc    Actualizar template
 * @route   PUT /api/v1/checklists/templates/:id
 * @access  Private/Admin/Arquitecto
 */
const updateTemplate = asyncHandler(async (req, res) => {
    const template = await checklistService.updateTemplate(req.params.id, req.body);

    await createAuditLog(req.userId, 'update_checklist_template', 'ChecklistTemplate', template.id, {
        changes: req.body
    });

    res.json({
        success: true,
        message: 'Template actualizado exitosamente',
        data: { template }
    });
});

/**
 * @desc    Agregar item al template
 * @route   POST /api/v1/checklists/templates/:id/items
 * @access  Private/Admin/Arquitecto
 */
const addItemToTemplate = asyncHandler(async (req, res) => {
    const item = await checklistService.addItemToTemplate(req.params.id, req.body);

    await createAuditLog(req.userId, 'add_checklist_item', 'ChecklistItem', item.id, {
        templateId: req.params.id,
        itemText: item.itemText
    });

    res.status(201).json({
        success: true,
        message: 'Item agregado al template exitosamente',
        data: { item }
    });
});

/**
 * @desc    Actualizar item del template
 * @route   PUT /api/v1/checklists/items/:itemId
 * @access  Private/Admin/Arquitecto
 */
const updateTemplateItem = asyncHandler(async (req, res) => {
    const item = await checklistService.updateTemplateItem(req.params.itemId, req.body);

    await createAuditLog(req.userId, 'update_checklist_item', 'ChecklistItem', item.id, {
        changes: req.body
    });

    res.json({
        success: true,
        message: 'Item actualizado exitosamente',
        data: { item }
    });
});

/**
 * @desc    Eliminar item del template
 * @route   DELETE /api/v1/checklists/items/:itemId
 * @access  Private/Admin/Arquitecto
 */
const deleteTemplateItem = asyncHandler(async (req, res) => {
    const item = await checklistService.deleteTemplateItem(req.params.itemId);

    await createAuditLog(req.userId, 'delete_checklist_item', 'ChecklistItem', item.id);

    res.json({
        success: true,
        message: 'Item eliminado exitosamente',
        data: { item }
    });
});

/**
 * @desc    Eliminar template completo
 * @route   DELETE /api/v1/checklists/templates/:id
 * @access  Private/Admin
 */
const deleteTemplate = asyncHandler(async (req, res) => {
    const template = await checklistService.deleteTemplate(req.params.id);

    await createAuditLog(req.userId, 'delete_checklist_template', 'ChecklistTemplate', template.id, {
        name: template.name
    });

    res.json({
        success: true,
        message: 'Template eliminado exitosamente',
        data: { template }
    });
});

module.exports = {
    getAllTemplates,
    getTemplateById,
    createTemplate,
    updateTemplate,
    addItemToTemplate,
    updateTemplateItem,
    deleteTemplateItem,
    deleteTemplate
};
