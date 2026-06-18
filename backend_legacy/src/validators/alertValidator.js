const Joi = require('joi');

const createAlertSchema = Joi.object({
    inspectionId: Joi.string().uuid().optional(),
    suspensionId: Joi.string().uuid().optional(),
    gravityLevel: Joi.number().valid(1, 2, 3).required().messages({
        'any.required': 'El nivel de gravedad es requerido',
        'any.only': 'El nivel de gravedad debe ser 1, 2 o 3'
    }),
    title: Joi.string().min(5).max(200).required().messages({
        'string.min': 'El titulo debe tener al menos 5 caracteres',
        'any.required': 'El titulo es requerido'
    }),
    description: Joi.string().min(10).required().messages({
        'string.min': 'La descripcion debe tener al menos 10 caracteres',
        'any.required': 'La descripcion es requerida'
    })
});

const updateAlertSchema = Joi.object({
    status: Joi.string().valid('abierta', 'en_revision', 'resuelta').optional(),
    gravityLevel: Joi.number().valid(1, 2, 3).optional()
});

module.exports = {
    createAlertSchema,
    updateAlertSchema
};
