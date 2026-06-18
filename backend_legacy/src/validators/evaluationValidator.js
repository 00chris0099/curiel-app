const Joi = require('joi');

const createEvaluationSchema = Joi.object({
    evaluatedUserId: Joi.string().uuid().required().messages({
        'any.required': 'El usuario evaluado es requerido'
    }),
    weekStart: Joi.date().iso().required().messages({
        'date.iso': 'La fecha de inicio debe ser una fecha valida',
        'any.required': 'La fecha de inicio es requerida'
    }),
    weekEnd: Joi.date().iso().min(Joi.ref('weekStart')).required().messages({
        'date.min': 'La fecha de fin debe ser posterior a la de inicio',
        'any.required': 'La fecha de fin es requerida'
    }),
    notes: Joi.string().optional().allow('', null),
    actions: Joi.string().optional().allow('', null)
});

const updateEvaluationSchema = Joi.object({
    notes: Joi.string().optional().allow('', null),
    actions: Joi.string().optional().allow('', null),
    status: Joi.string().valid('borrador', 'confirmada', 'enviada').optional()
});

module.exports = {
    createEvaluationSchema,
    updateEvaluationSchema
};
