const cloudinary = require('cloudinary').v2;
const config = require('../config');
const { AppError } = require('../middlewares/errorHandler');
const streamifier = require('streamifier');

// Configurar Cloudinary
cloudinary.config({
    cloud_name: config.cloudinary?.cloudName || process.env.CLOUDINARY_CLOUD_NAME,
    api_key: config.cloudinary?.apiKey || process.env.CLOUDINARY_API_KEY,
    api_secret: config.cloudinary?.apiSecret || process.env.CLOUDINARY_API_SECRET
});

/**
 * Subir imagen a Cloudinary desde buffer
 */
const uploadToCloudinary = (fileBuffer, options = {}) => {
    return new Promise((resolve, reject) => {
        const uploadOptions = {
            folder: options.folder || 'curiel/inspections',
            resource_type: 'image',
            transformation: [
                { quality: 'auto:good' },
                { fetch_format: 'auto' }
            ],
            ...options
        };

        const uploadStream = cloudinary.uploader.upload_stream(
            uploadOptions,
            (error, result) => {
                if (error) {
                    return reject(new AppError(
                        'Error al subir imagen a Cloudinary',
                        500,
                        'CLOUDINARY_UPLOAD_ERROR',
                        error.message
                    ));
                }
                resolve(result);
            }
        );

        streamifier.createReadStream(fileBuffer).pipe(uploadStream);
    });
};

/**
 * Eliminar imagen de Cloudinary
 */
const deleteFromCloudinary = async (publicId) => {
    try {
        const result = await cloudinary.uploader.destroy(publicId);
        return result;
    } catch (error) {
        throw new AppError(
            'Error al eliminar imagen de Cloudinary',
            500,
            'CLOUDINARY_DELETE_ERROR',
            error.message
        );
    }
};

/**
 * Obtener URL optimizada de imagen
 */
const getOptimizedUrl = (publicId, options = {}) => {
    return cloudinary.url(publicId, {
        transformation: [
            { quality: 'auto:good' },
            { fetch_format: 'auto' },
            ...options.transformations || []
        ]
    });
};

/**
 * Subir múltiples imágenes
 */
const uploadMultipleToCloudinary = async (files, options = {}) => {
    const uploadPromises = files.map(file => uploadToCloudinary(file.buffer, options));
    return await Promise.all(uploadPromises);
};

module.exports = {
    uploadToCloudinary,
    deleteFromCloudinary,
    getOptimizedUrl,
    uploadMultipleToCloudinary,
    cloudinary
};
