const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middlewares/auth');
const userController = require('../controllers/userController');

// Todas las rutas requieren autenticación
router.use(authenticate);

// GET /api/v1/users/profile - Obtener perfil propio
router.get('/profile', userController.getProfile);

// GET /api/v1/users/stats - Estadísticas (solo admin)
router.get('/stats', authorize('admin'), userController.getUserStats);

// GET /api/v1/users/inspectors - Lista de inspectores activos
router.get('/inspectors', authorize('admin', 'arquitecto'), userController.getInspectors);

// GET /api/v1/users - Listar todos los usuarios (solo admin)
router.get('/', authorize('admin'), userController.getAllUsers);

// POST /api/v1/users - Crear usuario (solo admin)
router.post('/', authorize('admin'), userController.createUser);

// GET /api/v1/users/:id - Obtener usuario por ID (solo admin)
router.get('/:id', authorize('admin'), userController.getUserById);

// PUT /api/v1/users/:id - Actualizar usuario (solo admin)
router.put('/:id', authorize('admin'), userController.updateUser);

// POST /api/v1/users/:id/transfer-master - Transferir master admin (solo master admin)
router.post('/:id/transfer-master', authorize('admin'), userController.transferMasterAdmin);

// PATCH /api/v1/users/:id/status - Cambiar estado (solo admin)
router.patch('/:id/status', authorize('admin'), userController.toggleUserStatus);

// DELETE /api/v1/users/:id - Eliminar usuario (solo admin)
router.delete('/:id', authorize('admin'), userController.deleteUser);

module.exports = router;
