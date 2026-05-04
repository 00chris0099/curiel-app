const Joi = require('joi');

/**
 * Validadores para módulo de inspecciones
 */

const createInspectionSchema = Joi.object({
    projectName: Joi.string().min(3).required().messages({
        'string.min': 'El nombre del proyecto debe tener al menos 3 caracteres',
        'any.required': 'El nombre del proyecto es requerido'
    }),
    clientName: Joi.string().min(3).required().messages({
        'string.min': 'El nombre del cliente debe tener al menos 3 caracteres',
        'any.required': 'El nombre del cliente es requerido'
    }),
    clientEmail: Joi.string().email().optional().allow('', null).messages({
        'string.email': 'El email del cliente debe ser válido'
    }),
    clientPhone: Joi.string().optional().allow('', null),
    address: Joi.string().min(5).required().messages({
        'string.min': 'La dirección debe tener al menos 5 caracteres',
        'any.required': 'La dirección es requerida'
    }),
    city: Joi.string().optional().allow('', null),
    state: Joi.string().optional().allow('', null),
    zipCode: Joi.string().optional().allow('', null),
    inspectionType: Joi.string().required().messages({
        'any.required': 'El tipo de inspección es requerido'
    }),
    scheduledDate: Joi.date().iso().required().messages({
        'date.base': 'La fecha programada debe ser válida',
        'any.required': 'La fecha programada es requerida'
    }),
    inspectorId: Joi.string().uuid().required().messages({
        'string.guid': 'El ID del inspector debe ser un UUID válido',
        'any.required': 'El inspector es requerido'
    }),
    notes: Joi.string().optional().allow('', null),
    latitude: Joi.number().min(-90).max(90).optional().allow(null).messages({
        'number.min': 'La latitud debe estar entre -90 y 90',
        'number.max': 'La latitud debe estar entre -90 y 90'
    }),
    longitude: Joi.number().min(-180).max(180).optional().allow(null).messages({
        'number.min': 'La longitud debe estar entre -180 y 180',
        'number.max': 'La longitud debe estar entre -180 y 180'
    })
});

const updateInspectionSchema = Joi.object({
    projectName: Joi.string().min(3).optional(),
    clientName: Joi.string().min(3).optional(),
    clientEmail: Joi.string().email().optional().allow('', null),
    clientPhone: Joi.string().optional().allow('', null),
    address: Joi.string().min(5).optional(),
    city: Joi.string().optional().allow('', null),
    state: Joi.string().optional().allow('', null),
    zipCode: Joi.string().optional().allow('', null),
    inspectionType: Joi.string().optional(),
    scheduledDate: Joi.date().iso().optional(),
    inspectorId: Joi.string().uuid().optional(),
    notes: Joi.string().optional().allow('', null),
    latitude: Joi.number().min(-90).max(90).optional().allow(null),
    longitude: Joi.number().min(-180).max(180).optional().allow(null)
});

const updateStatusSchema = Joi.object({
    status: Joi.string()
        .valid('pendiente', 'en_proceso', 'finalizada', 'cancelada')
        .required()
        .messages({
            'any.only': 'El estado debe ser pendiente, en_proceso, finalizada o cancelada',
            'any.required': 'El estado es requerido'
        })
});

module.exports = {
    createInspectionSchema,
    updateInspectionSchema,
    updateStatusSchema
};
