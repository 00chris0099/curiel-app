const { prisma } = require('../lib/databases');
const { AppError } = require('../middlewares/errorHandler');

class PdfTemplateService {
    async getAllTemplates(filters = {}) {
        const { category, search, page = 1, limit = 20 } = filters;
        const where = {};

        if (category) where.category = category;
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } }
            ];
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [templates, total] = await Promise.all([
            prisma.inspecciones.pdfTemplate.findMany({
                where,
                orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
                take: parseInt(limit),
                skip
            }),
            prisma.inspecciones.pdfTemplate.count({ where })
        ]);

        return {
            templates,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / parseInt(limit))
            }
        };
    }

    async getTemplateById(id) {
        const template = await prisma.inspecciones.pdfTemplate.findUnique({
            where: { id }
        });

        if (!template) {
            throw new AppError('Plantilla no encontrada', 404, 'TEMPLATE_NOT_FOUND');
        }

        return template;
    }

    async createTemplate(data, userId) {
        return prisma.inspecciones.pdfTemplate.create({
            data: {
                name: data.name,
                description: data.description || null,
                category: data.category || 'inspeccion',
                layoutJson: data.layoutJson,
                thumbnailUrl: data.thumbnailUrl || null,
                createdBy: userId,
                isDefault: data.isDefault || false
            }
        });
    }

    async updateTemplate(id, data, userId, isMasterAdmin = false) {
        const template = await this.getTemplateById(id);

        if (!isMasterAdmin && template.createdBy !== userId) {
            throw new AppError('No tienes permiso para editar esta plantilla', 403, 'FORBIDDEN');
        }

        return prisma.inspecciones.pdfTemplate.update({
            where: { id },
            data: {
                ...(data.name && { name: data.name }),
                ...(data.description !== undefined && { description: data.description }),
                ...(data.category && { category: data.category }),
                ...(data.layoutJson && { layoutJson: data.layoutJson }),
                ...(data.thumbnailUrl !== undefined && { thumbnailUrl: data.thumbnailUrl }),
                ...(data.isDefault !== undefined && { isDefault: data.isDefault })
            }
        });
    }

    async deleteTemplate(id, userId, isMasterAdmin = false) {
        const template = await this.getTemplateById(id);

        if (!isMasterAdmin && template.createdBy !== userId) {
            throw new AppError('No tienes permiso para eliminar esta plantilla', 403, 'FORBIDDEN');
        }

        if (template.isDefault) {
            throw new AppError('No se puede eliminar una plantilla predeterminada', 400, 'CANNOT_DELETE_DEFAULT');
        }

        await prisma.inspecciones.pdfTemplate.delete({ where: { id } });
    }
}

module.exports = new PdfTemplateService();
