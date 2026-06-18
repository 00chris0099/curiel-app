const Joi = require('joi');

const createClientSchema = Joi.object({
    documentType: Joi.string().valid('dni', 'ruc', 'ce').required().messages({
        'any.required': 'El tipo de documento es requerido',
        'any.only': 'El tipo de documento debe ser dni, ruc o ce'
    }),
    documentNumber: Joi.string().min(8).max(20).required().messages({
        'string.min': 'El numero de documento debe tener al menos 8 caracteres',
        'string.max': 'El numero de documento no puede exceder 20 caracteres',
        'any.required': 'El numero de documento es requerido'
    }),
    firstName: Joi.string().min(2).optional().allow('', null).messages({
        'string.min': 'El nombre debe tener al menos 2 caracteres'
    }),
    lastName: Joi.string().min(2).optional().allow('', null).messages({
        'string.min': 'El apellido debe tener al menos 2 caracteres'
    }),
    razonSocial: Joi.string().min(3).optional().allow('', null).messages({
        'string.min': 'La razon social debe tener al menos 3 caracteres'
    }),
    email: Joi.string().email().required().messages({
        'string.email': 'El email debe ser valido',
        'any.required': 'El email es requerido'
    }),
    phone: Joi.string().optional().allow('', null),
    address: Joi.string().optional().allow('', null),
    isProtected: Joi.boolean().optional()
}).or('razonSocial', 'firstName').messages({
    'object.missing': 'Debe proporcionar nombre y apellido, o razon social'
});

const updateClientSchema = Joi.object({
    documentType: Joi.string().valid('dni', 'ruc', 'ce').optional(),
    documentNumber: Joi.string().min(8).max(20).optional(),
    firstName: Joi.string().min(2).optional().allow('', null),
    lastName: Joi.string().min(2).optional().allow('', null),
    razonSocial: Joi.string().min(3).optional().allow('', null),
    email: Joi.string().email().optional(),
    phone: Joi.string().optional().allow('', null),
    address: Joi.string().optional().allow('', null),
    isProtected: Joi.boolean().optional()
});

module.exports = {
    createClientSchema,
    updateClientSchema
};
