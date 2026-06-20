const { prisma } = require('../lib/databases');
const { AppError } = require('../middlewares/errorHandler');

class ChecklistService {
    async getAllTemplates(filters = {}) {
        const { isActive } = filters;

        const where = {};
        if (typeof isActive === 'boolean') where.isActive = isActive;

        return prisma.admin.checklistTemplate.findMany({
            where,
            include: {
                items: { orderBy: { orderIndex: 'asc' } }
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    async getTemplateById(templateId) {
        const template = await prisma.admin.checklistTemplate.findUnique({
            where: { id: templateId },
            include: {
                items: { orderBy: { orderIndex: 'asc' } }
            }
        });

        if (!template) {
            throw new AppError('Template de checklist no encontrado', 404, 'TEMPLATE_NOT_FOUND');
        }

        return template;
    }

    async createTemplate(templateData, creatorId) {
        const { name, description, inspectionType, category, items } = templateData;
        const normalizedInspectionType = inspectionType || category;

        if (!normalizedInspectionType) {
            throw new AppError('El tipo de inspeccion es requerido', 400, 'INSPECTION_TYPE_REQUIRED');
        }

        const template = await prisma.admin.checklistTemplate.create({
            data: {
                name,
                description,
                inspectionType: normalizedInspectionType,
                createdById: creatorId,
                isActive: true,
                items: items && items.length > 0 ? {
                    create: items.map((item, index) => ({
                        itemText: item.itemText || item.description,
                        category: item.category || 'general',
                        isRequired: item.isRequired || false,
                        orderIndex: item.orderIndex || item.orderNumber || index + 1
                    }))
                } : undefined
            },
            include: {
                items: { orderBy: { orderIndex: 'asc' } }
            }
        });

        return template;
    }

    async updateTemplate(templateId, updateData) {
        const template = await prisma.admin.checklistTemplate.findUnique({
            where: { id: templateId }
        });

        if (!template) {
            throw new AppError('Template de checklist no encontrado', 404, 'TEMPLATE_NOT_FOUND');
        }

        const { name, description, inspectionType, category, isActive } = updateData;

        const data = {};
        if (name !== undefined) data.name = name;
        if (description !== undefined) data.description = description;
        if (inspectionType !== undefined) data.inspectionType = inspectionType;
        if (category !== undefined && inspectionType === undefined) data.inspectionType = category;
        if (isActive !== undefined) data.isActive = isActive;

        return prisma.admin.checklistTemplate.update({
            where: { id: templateId },
            data
        });
    }

    async addItemToTemplate(templateId, itemData) {
        const template = await prisma.admin.checklistTemplate.findUnique({
            where: { id: templateId }
        });

        if (!template) {
            throw new AppError('Template de checklist no encontrado', 404, 'TEMPLATE_NOT_FOUND');
        }

        const maxOrder = await prisma.admin.checklistItem.aggregate({
            _max: { orderIndex: true },
            where: { templateId }
        });

        return prisma.admin.checklistItem.create({
            data: {
                templateId,
                itemText: itemData.itemText || itemData.description,
                category: itemData.category || 'general',
                isRequired: itemData.isRequired || false,
                orderIndex: itemData.orderIndex || itemData.orderNumber || (maxOrder._max.orderIndex || 0) + 1
            }
        });
    }

    async updateTemplateItem(itemId, updateData) {
        const item = await prisma.admin.checklistItem.findUnique({
            where: { id: itemId }
        });

        if (!item) {
            throw new AppError('Item de checklist no encontrado', 404, 'ITEM_NOT_FOUND');
        }

        const { description, itemText, category, isRequired, orderNumber, orderIndex } = updateData;

        const data = {};
        if (description !== undefined) data.itemText = description;
        if (itemText !== undefined) data.itemText = itemText;
        if (category !== undefined) data.category = category;
        if (isRequired !== undefined) data.isRequired = isRequired;
        if (orderNumber !== undefined) data.orderIndex = orderNumber;
        if (orderIndex !== undefined) data.orderIndex = orderIndex;

        return prisma.admin.checklistItem.update({
            where: { id: itemId },
            data
        });
    }

    async deleteTemplateItem(itemId) {
        const item = await prisma.admin.checklistItem.findUnique({
            where: { id: itemId }
        });

        if (!item) {
            throw new AppError('Item de checklist no encontrado', 404, 'ITEM_NOT_FOUND');
        }

        await prisma.admin.checklistItem.delete({ where: { id: itemId } });

        return item;
    }

    async deleteTemplate(templateId) {
        const template = await prisma.admin.checklistTemplate.findUnique({
            where: { id: templateId }
        });

        if (!template) {
            throw new AppError('Template de checklist no encontrado', 404, 'TEMPLATE_NOT_FOUND');
        }

        await prisma.admin.checklistTemplate.delete({ where: { id: templateId } });

        return template;
    }
}

module.exports = new ChecklistService();
