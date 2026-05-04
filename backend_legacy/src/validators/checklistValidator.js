const Joi = require('joi');

/**
 * Validadores para módulo de checklists
 */

const createTemplateSchema = Joi.object({
    name: Joi.string().min(3).required().messages({
        'string.min': 'El nombre del template debe tener al menos 3 caracteres',
        'any.required': 'El nombre del template es requerido'
    }),
    description: Joi.string().optional().allow('', null),
    category: Joi.string().required().messages({
        'any.required': 'La categoría es requerida'
    }),
    items: Joi.array()
        .items(
            Joi.object({
                description: Joi.string().min(3).required().messages({
                    'string.min': 'La descripción del item debe tener al menos 3 caracteres',
                    'any.required': 'La descripción del item es requerida'
                }),
                category: Joi.string().default('general'),
                isRequired: Joi.boolean().default(false),
                orderNumber: Joi.number().integer().min(1).optional(),
                requiresPhoto: Joi.boolean().default(false),
                requiresComment: Joi.boolean().default(false)
            })
        )
        .optional()
        .default([])
});

const updateTemplateSchema = Joi.object({
    name: Joi.string().min(3).optional(),
    description: Joi.string().optional().allow('', null),
    category: Joi.string().optional(),
    isActive: Joi.boolean().optional()
});

const createItemSchema = Joi.object({
    description: Joi.string().min(3).required().messages({
        'string.min': 'La descripción del item debe tener al menos 3 caracteres',
        'any.required': 'La descripción del item es requerida'
    }),
    category: Joi.string().default('general'),
    isRequired: Joi.boolean().default(false),
    orderNumber: Joi.number().integer().min(1).optional(),
    requiresPhoto: Joi.boolean().default(false),
    requiresComment: Joi.boolean().default(false)
});

const updateItemSchema = Joi.object({
    description: Joi.string().min(3).optional(),
    category: Joi.string().optional(),
    isRequired: Joi.boolean().optional(),
    orderNumber: Joi.number().integer().min(1).optional(),
    requiresPhoto: Joi.boolean().optional(),
    requiresComment: Joi.boolean().optional()
});

module.exports = {
    createTemplateSchema,
    updateTemplateSchema,
    createItemSchema,
    updateItemSchema
};
