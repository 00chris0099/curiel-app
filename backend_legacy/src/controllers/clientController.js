const clientService = require('../services/clientService');
const { asyncHandler } = require('../middlewares/errorHandler');
const { createAuditLog } = require('../middlewares/auditLog');

/**
 * @desc    Obtener todos los clientes
 * @route   GET /api/v1/clients
 * @access  Private/Admin
 */
const getAllClients = asyncHandler(async (req, res) => {
    const filters = {
        search: req.query.search,
        documentType: req.query.documentType,
        page: req.query.page || 1,
        limit: req.query.limit || 10
    };

    const result = await clientService.getAllClients(filters);

    res.json({
        success: true,
        message: 'Clientes obtenidos exitosamente',
        data: result.clients,
        pagination: result.pagination
    });
});

/**
 * @desc    Obtener cliente por ID
 * @route   GET /api/v1/clients/:id
 * @access  Private/Admin
 */
const getClientById = asyncHandler(async (req, res) => {
    const client = await clientService.getClientById(req.params.id);

    res.json({
        success: true,
        data: { client }
    });
});

/**
 * @desc    Crear nuevo cliente
 * @route   POST /api/v1/clients
 * @access  Private/Admin
 */
const createClient = asyncHandler(async (req, res) => {
    const client = await clientService.createClient(req.body, req.userId, req.isMasterAdmin);

    await createAuditLog(req.userId, 'create_client', 'Client', client.id, {
        documentType: client.documentType,
        documentNumber: client.documentNumber,
        email: client.email
    });

    res.status(201).json({
        success: true,
        message: 'Cliente creado exitosamente',
        data: { client }
    });
});

/**
 * @desc    Actualizar cliente
 * @route   PUT /api/v1/clients/:id
 * @access  Private/Admin
 */
const updateClient = asyncHandler(async (req, res) => {
    const client = await clientService.updateClient(req.params.id, req.body);

    await createAuditLog(req.userId, 'update_client', 'Client', client.id, {
        changes: req.body
    });

    res.json({
        success: true,
        message: 'Cliente actualizado exitosamente',
        data: { client }
    });
});

/**
 * @desc    Eliminar cliente
 * @route   DELETE /api/v1/clients/:id
 * @access  Private/Admin
 */
const deleteClient = asyncHandler(async (req, res) => {
    const result = await clientService.deleteClient(req.params.id);

    await createAuditLog(req.userId, 'delete_client', 'Client', result.clientId);

    res.json({
        success: true,
        message: 'Cliente eliminado exitosamente',
        data: result
    });
});

/**
 * @desc    Buscar clientes
 * @route   GET /api/v1/clients/search
 * @access  Private/Admin
 */
const searchClients = asyncHandler(async (req, res) => {
    const clients = await clientService.searchClients(req.query.query);

    res.json({
        success: true,
        data: { clients }
    });
});

/**
 * @desc    Obtener historial de inspecciones de un cliente
 * @route   GET /api/v1/clients/:id/inspections
 * @access  Private/Admin
 */
const getClientInspections = asyncHandler(async (req, res) => {
    const filters = {
        status: req.query.status,
        page: req.query.page || 1,
        limit: req.query.limit || 10
    };

    const result = await clientService.getClientInspections(req.params.id, filters);

    res.json({
        success: true,
        data: result.inspections,
        pagination: result.pagination
    });
});

module.exports = {
    getAllClients,
    getClientById,
    createClient,
    updateClient,
    deleteClient,
    searchClients,
    getClientInspections
};
