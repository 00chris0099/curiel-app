const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { authenticate, authorize } = require('../middlewares/auth');
const validateRequest = require('../middlewares/validateRequest');
const { auditLog } = require('../middlewares/auditLog');

const router = express.Router();

/**
 * @route   POST /api/auth/login
 * @desc    Login de usuario
 * @access  Public
 */
router.post(
    '/login',
    [
        body('email').isEmail().withMessage('Email inválido'),
        body('password').notEmpty().withMessage('Contraseña requerida'),
        validateRequest
    ],
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
    [
        body('email').isEmail().withMessage('Email inválido'),
        body('password')
            .isLength({ min: 6 })
            .withMessage('La contraseña debe tener al menos 6 caracteres'),
        body('firstName').notEmpty().withMessage('Nombre requerido'),
        body('lastName').notEmpty().withMessage('Apellido requerido'),
        body('role')
            .isIn(['admin', 'arquitecto', 'inspector'])
            .withMessage('Rol inválido'),
        validateRequest
    ],
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
    [
        body('firstName').optional().notEmpty().withMessage('Nombre no puede estar vacío'),
        body('lastName').optional().notEmpty().withMessage('Apellido no puede estar vacío'),
        validateRequest
    ],
    auditLog('update_profile', 'User'),
    authController.updateProfile
);

/**
 * @route   PUT /api/auth/change-password
 * @desc    Cambiar contraseña
 * @access  Private
 */
router.put(
    '/change-password',
    authenticate,
    [
        body('currentPassword').notEmpty().withMessage('Contraseña actual requerida'),
        body('newPassword')
            .isLength({ min: 6 })
            .withMessage('La nueva contraseña debe tener al menos 6 caracteres'),
        validateRequest
    ],
    auditLog('change_password', 'User'),
    authController.changePassword
);

module.exports = router;
