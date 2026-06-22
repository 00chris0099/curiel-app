const apiKeyService = require('../services/apiKeyService');
const { asyncHandler } = require('../middlewares/errorHandler');
const { createAuditLog } = require('../middlewares/auditLog');

const getAllKeys = asyncHandler(async (req, res) => {
    const filters = {
        search: req.query.search,
        type: req.query.type,
        isActive: req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined,
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 50,
    };

    const result = await apiKeyService.getAll(filters);

    res.json({
        success: true,
        data: result.keys,
        pagination: result.pagination,
    });
});

const getKeyById = asyncHandler(async (req, res) => {
    const key = await apiKeyService.getById(req.params.id);
    res.json({ success: true, data: key });
});

const createKey = asyncHandler(async (req, res) => {
    const { name, type, description, expiresAt } = req.body;

    if (!name) {
        return res.status(400).json({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'El nombre es requerido' },
        });
    }

    const key = await apiKeyService.create({ name, type, description, expiresAt }, req.userId);

    await createAuditLog(req.userId, 'create_api_key', 'ApiKey', key.id, { name, type });

    res.status(201).json({
        success: true,
        message: 'API key creada exitosamente',
        data: key,
    });
});

const updateKey = asyncHandler(async (req, res) => {
    const key = await apiKeyService.update(req.params.id, req.body);

    await createAuditLog(req.userId, 'update_api_key', 'ApiKey', key.id, req.body);

    res.json({
        success: true,
        message: 'API key actualizada',
        data: key,
    });
});

const deleteKey = asyncHandler(async (req, res) => {
    await apiKeyService.delete(req.params.id);

    await createAuditLog(req.userId, 'delete_api_key', 'ApiKey', req.params.id, {});

    res.json({ success: true, message: 'API key eliminada' });
});

const revokeKey = asyncHandler(async (req, res) => {
    const key = await apiKeyService.revoke(req.params.id);

    await createAuditLog(req.userId, 'revoke_api_key', 'ApiKey', key.id, {});

    res.json({ success: true, message: 'API key revocada', data: key });
});

module.exports = {
    getAllKeys,
    getKeyById,
    createKey,
    updateKey,
    deleteKey,
    revokeKey,
};
