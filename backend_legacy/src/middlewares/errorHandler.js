/**
 * Middleware global de manejo de errores
 * Centraliza el manejo de todos los errores de la aplicación
 */

const config = require('../config');

/**
 * Error handler principal
 */
const errorHandler = (err, req, res, next) => {
    // Log del error (solo stack trace en desarrollo)
    if (config.server.env === 'development') {
        console.error('❌ Error Stack:', err.stack);
    } else {
        console.error('❌ Error:', err.message);
    }

    // ============================================
    // ERRORES DE SEQUELIZE (Base de Datos)
    // ============================================

    if (err.name === 'SequelizeValidationError') {
        return res.status(422).json({
            success: false,
            error: {
                code: 'VALIDATION_ERROR',
                message: 'Error de validación de datos',
                errors: err.errors.map(e => ({
                    field: e.path,
                    message: e.message,
                    value: e.value
                }))
            }
        });
    }

    if (err.name === 'SequelizeUniqueConstraintError') {
        const field = err.errors[0]?.path || 'campo';
        return res.status(409).json({
            success: false,
            error: {
                code: 'DUPLICATE_ENTRY',
                message: `Ya existe un registro con ese ${field}`,
                field
            }
        });
    }

    if (err.name === 'SequelizeForeignKeyConstraintError') {
        return res.status(400).json({
            success: false,
            error: {
                code: 'INVALID_REFERENCE',
                message: 'Referencia inválida: el registro relacionado no existe'
            }
        });
    }

    if (err.name === 'SequelizeDatabaseError') {
        return res.status(500).json({
            success: false,
            error: {
                code: 'DATABASE_ERROR',
                message: 'Error en la base de datos',
                ...(config.server.env === 'development' && { details: err.message })
            }
        });
    }

    // ============================================
    // ERRORES DE JWT (Autenticación)
    // ============================================

    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            success: false,
            error: {
                code: 'INVALID_TOKEN',
                message: 'Token de autenticación inválido'
            }
        });
    }

    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
            success: false,
            error: {
                code: 'TOKEN_EXPIRED',
                message: 'El token de autenticación ha expirado'
            }
        });
    }

    // ============================================
    // ERRORES DE MULTER (Archivos)
    // ============================================

    if (err.name === 'MulterError') {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({
                success: false,
                error: {
                    code: 'FILE_TOO_LARGE',
                    message: 'El archivo excede el tamaño máximo permitido'
                }
            });
        }

        if (err.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'TOO_MANY_FILES',
                    message: 'Demasiados archivos. Límite excedido'
                }
            });
        }

        return res.status(400).json({
            success: false,
            error: {
                code: 'FILE_UPLOAD_ERROR',
                message: 'Error al procesar el archivo',
                ...(config.server.env === 'development' && { details: err.message })
            }
        });
    }

    // ============================================
    // ERRORES PERSONALIZADOS (con statusCode)
    // ============================================

    if (err.statusCode) {
        return res.status(err.statusCode).json({
            success: false,
            error: {
                code: err.code || 'CUSTOM_ERROR',
                message: err.message || 'Error en la solicitud',
                ...(err.details && { details: err.details }),
                ...(config.server.env === 'development' && err.stack && { stack: err.stack })
            }
        });
    }

    // ============================================
    // ERROR GENÉRICO (500)
    // ============================================

    res.status(500).json({
        success: false,
        error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Error interno del servidor',
            ...(config.server.env === 'development' && {
                details: err.message,
                stack: err.stack
            })
        }
    });
};

/**
 * Manejador para rutas no encontradas (404)
 */
const notFound = (req, res, next) => {
    res.status(404).json({
        success: false,
        error: {
            code: 'NOT_FOUND',
            message: 'Ruta no encontrada',
            path: `${req.method} ${req.originalUrl}`
        }
    });
};

/**
 * Clase de error personalizado para usar en la aplicación
 */
class AppError extends Error {
    constructor(message, statusCode = 500, code = 'APP_ERROR', details = null) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
        this.isOperational = true;

        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * Async handler - Wrapper para funciones async
 * Elimina el need de try-catch en cada controller
 */
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
    errorHandler,
    notFound,
    AppError,
    asyncHandler
};
