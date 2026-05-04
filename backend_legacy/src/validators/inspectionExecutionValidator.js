const Joi = require('joi');
const { AppError } = require('../middlewares/errorHandler');

const decimalField = Joi.number().min(0).precision(2);

const areaCreateSchema = Joi.object({
    name: Joi.string().trim().min(2).required(),
    category: Joi.string().trim().min(2).default('interior'),
    lengthM: decimalField.optional().allow(null),
    widthM: decimalField.optional().allow(null),
    ceilingHeightM: decimalField.optional().allow(null),
    notes: Joi.string().trim().optional().allow('', null),
    status: Joi.string().valid('pendiente', 'en_revision', 'observado', 'aprobado').default('pendiente'),
    sortOrder: Joi.number().integer().min(0).optional()
});

const areaUpdateSchema = Joi.object({
    name: Joi.string().trim().min(2).optional(),
    category: Joi.string().trim().min(2).optional(),
    lengthM: decimalField.optional().allow(null),
    widthM: decimalField.optional().allow(null),
    ceilingHeightM: decimalField.optional().allow(null),
    notes: Joi.string().trim().optional().allow('', null),
    status: Joi.string().valid('pendiente', 'en_revision', 'observado', 'aprobado').optional(),
    sortOrder: Joi.number().integer().min(0).optional()
}).min(1);

const observationCreateSchema = Joi.object({
    areaId: Joi.string().uuid().required(),
    title: Joi.string().trim().min(2).required(),
    description: Joi.string().trim().min(3).required(),
    severity: Joi.string().valid('leve', 'media', 'alta', 'critica').required(),
    type: Joi.string().valid('humedad', 'electrico', 'sanitario', 'acabados', 'carpinteria', 'estructura', 'seguridad', 'otro').required(),
    recommendation: Joi.string().trim().optional().allow('', null),
    metricValue: decimalField.optional().allow(null),
    metricUnit: Joi.string().trim().max(20).optional().allow('', null),
    status: Joi.string().valid('pendiente', 'corregido', 'requiere_revision').default('pendiente')
});

const observationUpdateSchema = Joi.object({
    areaId: Joi.string().uuid().optional(),
    title: Joi.string().trim().min(2).optional(),
    description: Joi.string().trim().min(3).optional(),
    severity: Joi.string().valid('leve', 'media', 'alta', 'critica').optional(),
    type: Joi.string().valid('humedad', 'electrico', 'sanitario', 'acabados', 'carpinteria', 'estructura', 'seguridad', 'otro').optional(),
    recommendation: Joi.string().trim().optional().allow('', null),
    metricValue: decimalField.optional().allow(null),
    metricUnit: Joi.string().trim().max(20).optional().allow('', null),
    status: Joi.string().valid('pendiente', 'corregido', 'requiere_revision').optional()
}).min(1);

const photoCreateSchema = Joi.object({
    areaId: Joi.string().uuid().optional().allow('', null),
    observationId: Joi.string().uuid().optional().allow('', null),
    type: Joi.string().valid('edificio', 'plano', 'area', 'observacion', 'general').required(),
    url: Joi.string().uri().optional().allow('', null),
    caption: Joi.string().trim().optional().allow('', null),
    latitude: decimalField.optional().allow(null),
    longitude: decimalField.optional().allow(null)
});

const summaryUpdateSchema = Joi.object({
    generalConclusion: Joi.string().trim().optional().allow('', null),
    finalRecommendations: Joi.string().trim().optional().allow('', null),
    reportStatus: Joi.string().valid('borrador', 'listo_para_revision', 'aprobado').optional()
}).min(1);

const completeInspectionSchema = Joi.object({
    reportStatus: Joi.string().valid('listo_para_revision', 'aprobado').optional()
});

const validateExecutionPayload = (schema, payload) => {
    const { error, value } = schema.validate(payload, {
        abortEarly: false,
        stripUnknown: true,
        convert: true
    });

    if (error) {
        throw new AppError('Error de validación de datos', 422, 'VALIDATION_ERROR', error.details.map((detail) => ({
            field: detail.path.join('.'),
            message: detail.message
        })));
    }

    return value;
};

module.exports = {
    areaCreateSchema,
    areaUpdateSchema,
    observationCreateSchema,
    observationUpdateSchema,
    photoCreateSchema,
    summaryUpdateSchema,
    completeInspectionSchema,
    validateExecutionPayload
};
