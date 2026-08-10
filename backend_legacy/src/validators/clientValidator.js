const Joi = require('joi');

const validateDocumentAndPhone = (obj, helpers) => {
    const { documentType, documentNumber, phone } = obj;

    if (documentNumber) {
        const doc = documentNumber.trim();
        if (documentType === 'dni') {
            if (!/^\d{8}$/.test(doc)) {
                return helpers.message('El DNI debe tener exactamente 8 dígitos numéricos');
            }
        } else if (documentType === 'ruc') {
            if (!/^\d{11}$/.test(doc)) {
                return helpers.message('El RUC debe tener 11 dígitos numéricos');
            }
        } else if (documentType === 'ce') {
            if (!/^[a-zA-Z0-9]{8,12}$/.test(doc)) {
                return helpers.message('El carnet de extranjería debe tener entre 8 y 12 caracteres alfanuméricos');
            }
        } else {
            // General format check if documentType is not explicitly specified
            if (!/^\d{8}$/.test(doc) && !/^\d{11}$/.test(doc) && !/^[a-zA-Z0-9]{8,12}$/.test(doc)) {
                return helpers.message('El número de documento no es válido');
            }
        }
    }

    if (phone && typeof phone === 'string' && phone.trim() !== '') {
        const cleaned = phone.replace(/[\s-]/g, '');
        if (!/^\d{8-[15]}$/.test(cleaned) && !/^9\d{8}$/.test(cleaned) && !/^\+?\d{8,15}$/.test(cleaned)) {
            return helpers.message('El número telefónico debe ser válido');
        }
    }

    return obj;
};

const createClientSchema = Joi.object({
    documentType: Joi.string().valid('dni', 'ruc', 'ce').required().messages({
        'any.required': 'El tipo de documento es requerido',
        'any.only': 'El tipo de documento debe ser dni, ruc o ce'
    }),
    documentNumber: Joi.string().required().messages({
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
}).custom(validateDocumentAndPhone);

const updateClientSchema = Joi.object({
    documentType: Joi.string().valid('dni', 'ruc', 'ce').optional(),
    documentNumber: Joi.string().optional(),
    firstName: Joi.string().min(2).optional().allow('', null),
    lastName: Joi.string().min(2).optional().allow('', null),
    razonSocial: Joi.string().min(3).optional().allow('', null),
    email: Joi.string().email().optional(),
    phone: Joi.string().optional().allow('', null),
    address: Joi.string().optional().allow('', null),
    isProtected: Joi.boolean().optional()
}).custom(validateDocumentAndPhone);

module.exports = {
    createClientSchema,
    updateClientSchema
};
