const Joi = require('joi');

const createTemplateSchema = Joi.object({
    name: Joi.string().min(2).max(255).required(),
    description: Joi.string().optional().allow('', null),
    category: Joi.string().valid('inspeccion', 'reporte', 'custom').default('inspeccion'),
    layoutJson: Joi.object().required(),
    thumbnailUrl: Joi.string().uri().optional().allow('', null),
    isDefault: Joi.boolean().optional()
});

const updateTemplateSchema = Joi.object({
    name: Joi.string().min(2).max(255).optional(),
    description: Joi.string().optional().allow('', null),
    category: Joi.string().valid('inspeccion', 'reporte', 'custom').optional(),
    layoutJson: Joi.object().optional(),
    thumbnailUrl: Joi.string().uri().optional().allow('', null),
    isDefault: Joi.boolean().optional()
});

module.exports = { createTemplateSchema, updateTemplateSchema };
