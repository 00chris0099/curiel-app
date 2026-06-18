const Joi = require('joi');

const createSuspensionSchema = Joi.object({
    inspectorId: Joi.string().uuid().required().messages({
        'any.required': 'El inspector es requerido'
    }),
    reason: Joi.string().valid('abandono', 'rendimiento', 'conducta', 'otro').required().messages({
        'any.required': 'El motivo es requerido',
        'any.only': 'El motivo debe ser abandono, rendimiento, conducta o otro'
    }),
    description: Joi.string().min(50).required().messages({
        'string.min': 'La descripcion debe tener al menos 50 caracteres',
        'any.required': 'La descripcion es requerida'
    }),
    gravityLevel: Joi.number().valid(1, 2, 3).required().messages({
        'any.required': 'El nivel de gravedad es requerido',
        'any.only': 'El nivel de gravedad debe ser 1, 2 o 3'
    }),
    evidence: Joi.array().items(Joi.string().uri()).optional()
});

const updateSuspensionSchema = Joi.object({
    status: Joi.string().valid('activa', 'levantada').required().messages({
        'any.required': 'El estado es requerido'
    })
});

module.exports = {
    createSuspensionSchema,
    updateSuspensionSchema
};
