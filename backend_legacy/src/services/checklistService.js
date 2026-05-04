const { ChecklistTemplate, ChecklistItem, User } = require('../models');
const { AppError } = require('../middlewares/errorHandler');

const safeUserAttributes = {
    exclude: ['passwordHash', '_plainPassword']
};

/**
 * Servicio de gestión de checklists y templates
 */
class ChecklistService {
    /**
     * Obtener todos los templates de checklist
     */
    async getAllTemplates(filters = {}) {
        const { isActive, search } = filters;

        const where = {};
        if (typeof isActive === 'boolean') where.isActive = isActive;

        const templates = await ChecklistTemplate.findAll({
            where,
            include: [
                {
                    model: ChecklistItem,
                    as: 'items',
                    separate: true,
                    order: [['orderIndex', 'ASC']]
                },
                {
                    model: User,
                    as: 'creator',
                    attributes: safeUserAttributes
                }
            ],
            order: [['createdAt', 'DESC']]
        });

        return templates;
    }

    /**
     * Obtener template por ID
     */
    async getTemplateById(templateId) {
        const template = await ChecklistTemplate.findByPk(templateId, {
            include: [
                {
                    model: ChecklistItem,
                    as: 'items',
                    separate: true,
                    order: [['orderIndex', 'ASC']]
                },
                {
                    model: User,
                    as: 'creator',
                    attributes: safeUserAttributes
                }
            ]
        });

        if (!template) {
            throw new AppError('Template de checklist no encontrado', 404, 'TEMPLATE_NOT_FOUND');
        }

        return template;
    }

    /**
     * Crear nuevo template de checklist
     */
    async createTemplate(templateData, creatorId) {
        const {
            name,
            description,
            inspectionType,
            category,
            items
        } = templateData;

        const normalizedInspectionType = inspectionType || category;

        if (!normalizedInspectionType) {
            throw new AppError('El tipo de inspeccion es requerido', 400, 'INSPECTION_TYPE_REQUIRED');
        }

        const template = await ChecklistTemplate.create({
            name,
            description,
            inspectionType: normalizedInspectionType,
            createdById: creatorId,
            isActive: true
        });

        // Crear items del checklist
        if (items && items.length > 0) {
            const checklistItems = items.map((item, index) => ({
                templateId: template.id,
                itemText: item.itemText || item.description,
                category: item.category || 'general',
                isRequired: item.isRequired || false,
                orderIndex: item.orderIndex || item.orderNumber || index + 1
            }));

            await ChecklistItem.bulkCreate(checklistItems);
        }

        // Recargar con items
        await template.reload({
            include: [
                {
                    model: ChecklistItem,
                    as: 'items',
                    separate: true,
                    order: [['orderIndex', 'ASC']]
                }
            ]
        });

        return template;
    }

    /**
     * Actualizar template
     */
    async updateTemplate(templateId, updateData) {
        const template = await ChecklistTemplate.findByPk(templateId);

        if (!template) {
            throw new AppError('Template de checklist no encontrado', 404, 'TEMPLATE_NOT_FOUND');
        }

        const { name, description, inspectionType, category, isActive } = updateData;

        if (name !== undefined) template.name = name;
        if (description !== undefined) template.description = description;
        if (inspectionType !== undefined) template.inspectionType = inspectionType;
        if (category !== undefined && inspectionType === undefined) template.inspectionType = category;
        if (isActive !== undefined) template.isActive = isActive;

        await template.save();

        return template;
    }

    /**
     * Agregar item al template
     */
    async addItemToTemplate(templateId, itemData) {
        const template = await ChecklistTemplate.findByPk(templateId);

        if (!template) {
            throw new AppError('Template de checklist no encontrado', 404, 'TEMPLATE_NOT_FOUND');
        }

        // Obtener el siguiente número de orden
        const maxOrder = await ChecklistItem.max('orderIndex', {
            where: { templateId }
        });

        const item = await ChecklistItem.create({
            templateId,
            itemText: itemData.itemText || itemData.description,
            category: itemData.category || 'general',
            isRequired: itemData.isRequired || false,
            orderIndex: itemData.orderIndex || itemData.orderNumber || (maxOrder || 0) + 1
        });

        return item;
    }

    /**
     * Actualizar item del template
     */
    async updateTemplateItem(itemId, updateData) {
        const item = await ChecklistItem.findByPk(itemId);

        if (!item) {
            throw new AppError('Item de checklist no encontrado', 404, 'ITEM_NOT_FOUND');
        }

        const {
            description,
            itemText,
            category,
            isRequired,
            orderNumber,
            orderIndex
        } = updateData;

        if (description !== undefined) item.itemText = description;
        if (itemText !== undefined) item.itemText = itemText;
        if (category !== undefined) item.category = category;
        if (isRequired !== undefined) item.isRequired = isRequired;
        if (orderNumber !== undefined) item.orderIndex = orderNumber;
        if (orderIndex !== undefined) item.orderIndex = orderIndex;

        await item.save();

        return item;
    }

    /**
     * Eliminar item del template
     */
    async deleteTemplateItem(itemId) {
        const item = await ChecklistItem.findByPk(itemId);

        if (!item) {
            throw new AppError('Item de checklist no encontrado', 404, 'ITEM_NOT_FOUND');
        }

        await item.destroy();

        return item;
    }

    /**
     * Eliminar template completo
     */
    async deleteTemplate(templateId) {
        const template = await ChecklistTemplate.findByPk(templateId);

        if (!template) {
            throw new AppError('Template de checklist no encontrado', 404, 'TEMPLATE_NOT_FOUND');
        }

        // CASCADE eliminará automáticamente los items
        await template.destroy();

        return template;
    }
}

module.exports = new ChecklistService();
