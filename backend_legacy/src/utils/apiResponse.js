/**
 * Utilidad para respuestas API estandarizadas
 * Asegura consistencia en todas las respuestas del backend
 */

/**
 * Respuesta exitosa con datos
 * @param {Object} res - Express response object
 * @param {Object} data - Datos a retornar
 * @param {String} message - Mensaje opcional
 * @param {Object} meta - Metadata opcional (paginación, etc.)
 * @param {Number} statusCode - Código HTTP (default: 200)
 */
const successResponse = (res, data = null, message = null, meta = null, statusCode = 200) => {
    const response = {
        success: true
    };

    if (message) {
        response.message = message;
    }

    if (data !== null) {
        response.data = data;
    }

    if (meta) {
        response.meta = meta;
    }

    return res.status(statusCode).json(response);
};

/**
 * Respuesta exitosa para creación (201 Created)
 */
const createdResponse = (res, data, message = 'Recurso creado exitosamente') => {
    return successResponse(res, data, message, null, 201);
};

/**
 * Respuesta exitosa sin contenido (204 No Content)
 */
const noContentResponse = (res) => {
    return res.status(204).send();
};

/**
 * Respuesta de error estandarizada
 * @param {Object} res - Express response object
 * @param {String} code - Código de error
 * @param {String} message - Mensaje de error
 * @param {Number} statusCode - Código HTTP
 * @param {Object} details - Detalles adicionales (solo en development)
 */
const errorResponse = (res, code, message, statusCode = 400, details = null) => {
    const response = {
        success: false,
        error: {
            code,
            message
        }
    };

    // Incluir detalles solo en desarrollo
    if (details && process.env.NODE_ENV === 'development') {
        response.error.details = details;
    }

    return res.status(statusCode).json(response);
};

/**
 * Errores específicos pre-configurados
 */

const badRequestError = (res, message = 'Solicitud inválida', details = null) => {
    return errorResponse(res, 'BAD_REQUEST', message, 400, details);
};

const unauthorizedError = (res, message = 'No autorizado', details = null) => {
    return errorResponse(res, 'UNAUTHORIZED', message, 401, details);
};

const forbiddenError = (res, message = 'Acceso denegado', details = null) => {
    return errorResponse(res, 'FORBIDDEN', message, 403, details);
};

const notFoundError = (res, message = 'Recurso no encontrado', details = null) => {
    return errorResponse(res, 'NOT_FOUND', message, 404, details);
};

const conflictError = (res, message = 'Conflicto con el estado actual', details = null) => {
    return errorResponse(res, 'CONFLICT', message, 409, details);
};

const validationError = (res, errors, message = 'Errores de validación') => {
    return res.status(422).json({
        success: false,
        error: {
            code: 'VALIDATION_ERROR',
            message,
            errors
        }
    });
};

const serverError = (res, message = 'Error interno del servidor', details = null) => {
    return errorResponse(res, 'INTERNAL_SERVER_ERROR', message, 500, details);
};

/**
 * Respuesta con paginación
 */
const paginatedResponse = (res, data, pagination, message = null) => {
    return successResponse(res, data, message, pagination);
};

module.exports = {
    // Respuestas exitosas
    successResponse,
    createdResponse,
    noContentResponse,
    paginatedResponse,

    // Respuestas de error
    errorResponse,
    badRequestError,
    unauthorizedError,
    forbiddenError,
    notFoundError,
    conflictError,
    validationError,
    serverError
};
