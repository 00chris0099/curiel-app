const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middlewares/auth');
const clientController = require('../controllers/clientController');
const validateJoi = require('../middlewares/validateJoi');
const { createClientSchema, updateClientSchema } = require('../validators/clientValidator');

// Todas las rutas requieren autenticacion
router.use(authenticate);

// GET /api/v1/clients/search - Buscar clientes (debe ir antes de /:id)
router.get('/search', authorize('admin'), clientController.searchClients);

// GET /api/v1/clients - Listar clientes (solo admin)
router.get('/', authorize('admin'), clientController.getAllClients);

// GET /api/v1/clients/:id - Obtener cliente por ID (solo admin)
router.get('/:id', authorize('admin'), clientController.getClientById);

// POST /api/v1/clients - Crear cliente (solo admin)
router.post('/', authorize('admin'), validateJoi(createClientSchema), clientController.createClient);

// PUT /api/v1/clients/:id - Actualizar cliente (solo admin)
router.put('/:id', authorize('admin'), validateJoi(updateClientSchema), clientController.updateClient);

// DELETE /api/v1/clients/:id - Eliminar cliente (solo admin)
router.delete('/:id', authorize('admin'), clientController.deleteClient);

// GET /api/v1/clients/:id/inspections - Historial de inspecciones del cliente
router.get('/:id/inspections', authorize('admin'), clientController.getClientInspections);

module.exports = router;
