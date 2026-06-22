const crypto = require('crypto');
const { prisma } = require('../lib/databases');
const { AppError } = require('../middlewares/errorHandler');

const generateApiKey = (type = 'api_key') => {
    const prefix = type === 'secret_token' ? 'sk_live_' : 'curiel_';
    const random = crypto.randomBytes(32).toString('hex');
    return `${prefix}${random}`;
};

class ApiKeyService {
    async getAll(filters = {}) {
        const { search, type, isActive, page = 1, limit = 50 } = filters;
        const where = {};

        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
            ];
        }
        if (type) where.type = type;
        if (isActive !== undefined) where.isActive = isActive;

        const [keys, total] = await Promise.all([
            prisma.admin.apiKey.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
                select: {
                    id: true,
                    name: true,
                    key: true,
                    type: true,
                    prefix: true,
                    isActive: true,
                    expiresAt: true,
                    lastUsedAt: true,
                    description: true,
                    createdAt: true,
                    createdById: true,
                },
            }),
            prisma.admin.apiKey.count({ where }),
        ]);

        const masked = keys.map((k) => ({
            ...k,
            keyPreview: k.key.substring(0, 12) + '...' + k.key.substring(k.key.length - 4),
            isExpired: k.expiresAt ? new Date(k.expiresAt) < new Date() : false,
        }));

        return {
            keys: masked,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async getById(id) {
        const key = await prisma.admin.apiKey.findUnique({ where: { id } });
        if (!key) throw new AppError('API key no encontrada', 404, 'NOT_FOUND');
        return {
            ...key,
            keyPreview: key.key.substring(0, 12) + '...' + key.key.substring(key.key.length - 4),
        };
    }

    async create(data, userId) {
        const { name, type = 'api_key', description, expiresAt } = data;

        const key = generateApiKey(type);

        const created = await prisma.admin.apiKey.create({
            data: {
                name,
                key,
                type,
                prefix: type === 'secret_token' ? 'sk_live_' : 'curiel_',
                description: description || null,
                expiresAt: expiresAt ? new Date(expiresAt) : null,
                createdById: userId,
            },
        });

        return {
            ...created,
            keyPreview: created.key.substring(0, 12) + '...' + created.key.substring(created.key.length - 4),
        };
    }

    async update(id, data) {
        const existing = await prisma.admin.apiKey.findUnique({ where: { id } });
        if (!existing) throw new AppError('API key no encontrada', 404, 'NOT_FOUND');

        const updated = await prisma.admin.apiKey.update({
            where: { id },
            data: {
                name: data.name ?? existing.name,
                isActive: data.isActive ?? existing.isActive,
                description: data.description ?? existing.description,
                expiresAt: data.expiresAt !== undefined ? (data.expiresAt ? new Date(data.expiresAt) : null) : existing.expiresAt,
            },
        });

        return updated;
    }

    async delete(id) {
        const existing = await prisma.admin.apiKey.findUnique({ where: { id } });
        if (!existing) throw new AppError('API key no encontrada', 404, 'NOT_FOUND');

        await prisma.admin.apiKey.delete({ where: { id } });
        return { deleted: true };
    }

    async revoke(id) {
        return this.update(id, { isActive: false });
    }

    async validate(key) {
        const record = await prisma.admin.apiKey.findUnique({ where: { key } });
        if (!record) return null;
        if (!record.isActive) return null;
        if (record.expiresAt && new Date(record.expiresAt) < new Date()) return null;

        await prisma.admin.apiKey.update({
            where: { id: record.id },
            data: { lastUsedAt: new Date() },
        });

        return record;
    }
}

module.exports = new ApiKeyService();
