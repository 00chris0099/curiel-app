const express = require('express');
const authController = require('../controllers/authController');
const { authenticate, authorize } = require('../middlewares/auth');
const validateJoi = require('../middlewares/validateJoi');
const { auditLog } = require('../middlewares/auditLog');
const {
    loginSchema,
    registerSchema,
    updateProfileSchema,
    changePasswordSchema,
    refreshTokenSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
} = require('../validators/authValidator');

const router = express.Router();

/**
 * @route   POST /api/auth/login
 * @desc    Login de usuario
 * @access  Public
 */
router.post(
    '/login',
    validateJoi(loginSchema),
    authController.login
);

/**
 * @route   POST /api/auth/register
 * @desc    Registro de nuevo usuario (solo Admin)
 * @access  Private (Admin)
 */
router.post(
    '/register',
    authenticate,
    authorize('admin'),
    validateJoi(registerSchema),
    auditLog('register', 'User'),
    authController.register
);

/**
 * @route   GET /api/auth/me
 * @desc    Obtener perfil del usuario autenticado
 * @access  Private
 */
router.get('/me', authenticate, authController.getMe);

/**
 * @route   PUT /api/auth/me
 * @desc    Actualizar perfil
 * @access  Private
 */
router.put(
    '/me',
    authenticate,
    validateJoi(updateProfileSchema),
    auditLog('update_profile', 'User'),
    authController.updateProfile
);

/**
 * @route   PUT /api/auth/change-password
 * @desc    Cambiar contrasena
 * @access  Private
 */
router.put(
    '/change-password',
    authenticate,
    validateJoi(changePasswordSchema),
    auditLog('change_password', 'User'),
    authController.changePassword
);

/**
 * @route   POST /api/auth/refresh
 * @desc    Renovar access token usando refresh token
 * @access  Public (solo necesita refresh token)
 */
router.post(
    '/refresh',
    validateJoi(refreshTokenSchema),
    authController.refreshToken
);

/**
 * @route   POST /api/auth/logout
 * @desc    Cerrar sesion (revocar refresh token)
 * @access  Private
 */
router.post(
    '/logout',
    authenticate,
    authController.logout
);

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Solicitar restablecimiento de contrasena
 * @access  Public
 */
router.post(
    '/forgot-password',
    validateJoi(forgotPasswordSchema),
    authController.forgotPassword
);

/**
 * @route   POST /api/auth/reset-password
 * @desc    Restablecer contrasena con token
 * @access  Public
 */
router.post(
    '/reset-password',
    validateJoi(resetPasswordSchema),
    authController.resetPassword
);

module.exports = router;
