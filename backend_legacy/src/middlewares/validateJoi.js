/**
 * Middleware generico para validacion con Joi
 * @param {Joi.Schema} schema - Schema de Joi a validar
 * @param {string} source - Fuente de datos a validar ('body', 'query', 'params')
 */
const validateJoi = (schema, source = 'body') => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req[source], {
            abortEarly: false,
            stripUnknown: true
        });

        if (error) {
            const errors = error.details.map((detail) => ({
                field: detail.path.join('.'),
                message: detail.message,
                value: detail.context?.value
            }));

            return res.status(422).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Errores de validacion',
                    errors
                }
            });
        }

        // Reemplazar body con datos sanitizados
        req[source] = value;
        next();
    };
};

module.exports = validateJoi;
