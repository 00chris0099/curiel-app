const Joi = require('joi');

/**
 * Validadores para módulo de autenticación
 */

const loginSchema = Joi.object({
    email: Joi.string().email().required().messages({
        'string.email': 'Email inválido',
        'any.required': 'Email es requerido'
    }),
    password: Joi.string().required().messages({
        'any.required': 'Contraseña requerida'
    })
});

const registerSchema = Joi.object({
    email: Joi.string().email().required().messages({
        'string.email': 'Email inválido',
        'any.required': 'Email es requerido'
    }),
    password: Joi.string().min(6).required().messages({
        'string.min': 'La contraseña debe tener al menos 6 caracteres',
        'any.required': 'Contraseña requerida'
    }),
    firstName: Joi.string().min(1).required().messages({
        'any.required': 'Nombre requerido'
    }),
    lastName: Joi.string().min(1).required().messages({
        'any.required': 'Apellido requerido'
    }),
    role: Joi.string().valid('admin', 'arquitecto', 'inspector', 'supervisor').required().messages({
        'any.only': 'Rol inválido',
        'any.required': 'Rol requerido'
    })
});

const updateProfileSchema = Joi.object({
    firstName: Joi.string().min(1).optional().messages({
        'string.min': 'Nombre no puede estar vacío'
    }),
    lastName: Joi.string().min(1).optional().messages({
        'string.min': 'Apellido no puede estar vacío'
    })
}).min(1).messages({
    'object.min': 'Debe proporcionar al menos un campo para actualizar'
});

const changePasswordSchema = Joi.object({
    currentPassword: Joi.string().required().messages({
        'any.required': 'Contraseña actual requerida'
    }),
    newPassword: Joi.string().min(6).required().messages({
        'string.min': 'La nueva contraseña debe tener al menos 6 caracteres',
        'any.required': 'Nueva contraseña requerida'
    })
});

const refreshTokenSchema = Joi.object({
    refreshToken: Joi.string().required().messages({
        'any.required': 'Refresh token requerido'
    })
});

const forgotPasswordSchema = Joi.object({
    email: Joi.string().email().required().messages({
        'string.email': 'Email inválido',
        'any.required': 'Email es requerido'
    })
});

const resetPasswordSchema = Joi.object({
    token: Joi.string().required().messages({
        'any.required': 'Token requerido'
    }),
    newPassword: Joi.string().min(6).required().messages({
        'string.min': 'La contraseña debe tener al menos 6 caracteres',
        'any.required': 'Contraseña requerida'
    })
});

module.exports = {
    loginSchema,
    registerSchema,
    updateProfileSchema,
    changePasswordSchema,
    refreshTokenSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
};
