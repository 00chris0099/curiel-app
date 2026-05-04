const userService = require('../services/userService');
const { asyncHandler, AppError } = require('../middlewares/errorHandler');
const { createAuditLog } = require('../middlewares/auditLog');

/**
 * @desc    Obtener todos los usuarios (solo admin)
 * @route   GET /api/v1/users
 * @access  Private/Admin
 */
const getAllUsers = asyncHandler(async (req, res) => {
    const filters = {
        role: req.query.role,
        isActive: req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined,
        search: req.query.search,
        page: req.query.page || 1,
        limit: req.query.limit || 10
    };

    const result = await userService.getAllUsers(filters);

    res.json({
        success: true,
        message: 'Usuarios obtenidos exitosamente',
        data: result.users,
        pagination: result.pagination
    });
});

/**
 * @desc    Obtener inspectores activos para asignacion
 * @route   GET /api/v1/users/inspectors
 * @access  Private/Admin/Arquitecto
 */
const getInspectors = asyncHandler(async (req, res) => {
    const users = await userService.getInspectors();

    res.json({
        success: true,
        data: users
    });
});

/**
 * @desc    Obtener perfil del usuario autenticado
 * @route   GET /api/v1/users/profile
 * @access  Private
 */
const getProfile = asyncHandler(async (req, res) => {
    const user = await userService.getUserById(req.userId);

    res.json({
        success: true,
        data: { user }
    });
});

/**
 * @desc    Obtener usuario por ID
 * @route   GET /api/v1/users/:id
 * @access  Private/Admin
 */
const getUserById = asyncHandler(async (req, res) => {
    const user = await userService.getUserById(req.params.id);

    res.json({
        success: true,
        data: { user }
    });
});

/**
 * @desc    Crear nuevo usuario
 * @route   POST /api/v1/users
 * @access  Private/Admin
 */
const createUser = asyncHandler(async (req, res) => {
    const user = await userService.createUser(req.body, req.userId);

    await createAuditLog(req.userId, 'create_user', 'User', user.id, {
        email: user.email,
        role: user.role
    });

    res.status(201).json({
        success: true,
        message: 'Usuario creado exitosamente',
        data: { user }
    });
});

/**
 * @desc    Actualizar usuario
 * @route   PUT /api/v1/users/:id
 * @access  Private/Admin
 */
const updateUser = asyncHandler(async (req, res) => {
    const user = await userService.updateUser(req.params.id, req.body, req.userId);

    await createAuditLog(req.userId, 'update_user', 'User', user.id, {
        changes: req.body
    });

    res.json({
        success: true,
        message: 'Usuario actualizado exitosamente',
        data: { user }
    });
});

/**
 * @desc    Cambiar estado de usuario (activar/desactivar)
 * @route   PATCH /api/v1/users/:id/status
 * @access  Private/Admin
 */
const toggleUserStatus = asyncHandler(async (req, res) => {
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
        throw new AppError('El campo isActive debe ser un valor booleano', 400, 'INVALID_INPUT');
    }

    const user = await userService.toggleUserStatus(req.params.id, isActive);

    await createAuditLog(req.userId, 'toggle_user_status', 'User', user.id, {
        isActive
    });

    res.json({
        success: true,
        message: `Usuario ${isActive ? 'activado' : 'desactivado'} exitosamente`,
        data: { user }
    });
});

/**
 * @desc    Eliminar usuario (soft delete)
 * @route   DELETE /api/v1/users/:id
 * @access  Private/Admin
 */
const deleteUser = asyncHandler(async (req, res) => {
    const user = await userService.deleteUser(req.params.id);

    await createAuditLog(req.userId, 'delete_user', 'User', user.id);

    res.json({
        success: true,
        message: 'Usuario eliminado exitosamente',
        data: { user }
    });
});

/**
 * @desc    Transferir el master admin a otro usuario
 * @route   POST /api/v1/users/:id/transfer-master
 * @access  Private/MasterAdmin
 */
const transferMasterAdmin = asyncHandler(async (req, res) => {
    const newMasterUserId = req.params.id;
    const updatedUser = await userService.transferMasterAdmin(req.userId, newMasterUserId);

    await createAuditLog(req.userId, 'transfer_master_admin', 'User', updatedUser.id, {
        newMasterUserId
    });

    res.json({
        success: true,
        message: 'Master admin transferido exitosamente',
        data: { user: updatedUser }
    });
});

/**
 * @desc    Obtener estadísticas de usuarios
 * @route   GET /api/v1/users/stats
 * @access  Private/Admin
 */
const getUserStats = asyncHandler(async (req, res) => {
    const stats = await userService.getUserStats();

    res.json({
        success: true,
        data: { stats }
    });
});

module.exports = {
    getAllUsers,
    getInspectors,
    getProfile,
    getUserById,
    createUser,
    updateUser,
    toggleUserStatus,
    deleteUser,
    transferMasterAdmin,
    getUserStats
};
