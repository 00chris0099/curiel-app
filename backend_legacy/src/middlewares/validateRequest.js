const { validationResult } = require('express-validator');

/**
 * Middleware para manejar errores de validacion
 */
const validateRequest = (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Errores de validacion',
            errors: errors.array().map(err => ({
                field: err.path || err.param,
                message: err.msg,
                value: err.value
            }))
        });
    }

    next();
};

module.exports = validateRequest;
