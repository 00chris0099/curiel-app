const multer = require('multer');
const path = require('path');
const config = require('../config');
const { AppError } = require('./errorHandler');

// Configurar almacenamiento en memoria
const storage = multer.memoryStorage();

// Filtro de archivos - solo imágenes
const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new AppError(
            'Formato de archivo no permitido. Solo se permiten imágenes (JPEG, PNG, WebP)',
            400,
            'INVALID_FILE_TYPE'
        ), false);
    }
};

// Configuración de multer
const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: config.upload?.maxFileSize || 10 * 1024 * 1024 // 10MB por defecto
    }
});

/**
 * Middleware para subir una sola imagen
 */
const uploadSingle = upload.single('photo');

/**
 * Middleware para subir múltiples imágenes
 */
const uploadMultiple = upload.array('photos', 10); // Máximo 10 fotos

/**
 * Wrapper para manejar errores de multer
 */
const handleUploadError = (uploadMiddleware) => {
    return (req, res, next) => {
        uploadMiddleware(req, res, (err) => {
            if (err instanceof multer.MulterError) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return next(new AppError(
                        'El archivo excede el tamaño máximo permitido (10MB)',
                        413,
                        'FILE_TOO_LARGE'
                    ));
                }
                if (err.code === 'LIMIT_FILE_COUNT') {
                    return next(new AppError(
                        'Se excedió el número máximo de archivos permitidos',
                        400,
                        'TOO_MANY_FILES'
                    ));
                }
                return next(new AppError(
                    'Error al procesar el archivo',
                    400,
                    'UPLOAD_ERROR',
                    err.message
                ));
            }

            if (err) {
                return next(err);
            }

            next();
        });
    };
};

module.exports = {
    uploadSingle: handleUploadError(uploadSingle),
    uploadMultiple: handleUploadError(uploadMultiple)
};
