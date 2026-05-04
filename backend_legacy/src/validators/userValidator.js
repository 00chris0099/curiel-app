const Joi = require('joi');

/**
 * Validadores para módulo de usuarios
 */

const createUserSchema = Joi.object({
    email: Joi.string().email().required().messages({
        'string.email': 'El email debe ser válido',
        'any.required': 'El email es requerido'
    }),
    password: Joi.string().min(8).required().messages({
        'string.min': 'La contraseña debe tener al menos 8 caracteres',
        'any.required': 'La contraseña es requerida'
    }),
    firstName: Joi.string().min(2).required().messages({
        'string.min': 'El nombre debe tener al menos 2 caracteres',
        'any.required': 'El nombre es requerido'
    }),
    lastName: Joi.string().min(2).required().messages({
        'string.min': 'El apellido debe tener al menos 2 caracteres',
        'any.required': 'El apellido es requerido'
    }),
    role: Joi.string().valid('admin', 'arquitecto', 'inspector').default('inspector').messages({
        'any.only': 'El rol debe ser admin, arquitecto o inspector'
    }),
    phone: Joi.string().optional().allow('', null)
});

const updateUserSchema = Joi.object({
    firstName: Joi.string().min(2).optional().messages({
        'string.min': 'El nombre debe tener al menos 2 caracteres'
    }),
    lastName: Joi.string().min(2).optional().messages({
        'string.min': 'El apellido debe tener al menos 2 caracteres'
    }),
    phone: Joi.string().optional().allow('', null),
    role: Joi.string().valid('admin', 'arquitecto', 'inspector').optional().messages({
        'any.only': 'El rol debe ser admin, arquitecto o inspector'
    })
});

const toggleStatusSchema = Joi.object({
    isActive: Joi.boolean().required().messages({
        'any.required': 'El campo isActive es requerido',
        'boolean.base': 'El campo isActive debe ser un valor booleano'
    })
});

module.exports = {
    createUserSchema,
    updateUserSchema,
    toggleStatusSchema
};
