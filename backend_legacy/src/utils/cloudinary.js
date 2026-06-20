const cloudinary = require('cloudinary').v2;
const config = require('../config');
const { AppError } = require('../middlewares/errorHandler');
const streamifier = require('streamifier');
const logger = require('./logger');

const cloudinaryConfig = {
    cloudName: config.cloudinary?.cloudName || process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: config.cloudinary?.apiKey || process.env.CLOUDINARY_API_KEY,
    apiSecret: config.cloudinary?.apiSecret || process.env.CLOUDINARY_API_SECRET
};

// Configurar Cloudinary
cloudinary.config({
    cloud_name: cloudinaryConfig.cloudName,
    api_key: cloudinaryConfig.apiKey,
    api_secret: cloudinaryConfig.apiSecret
});

const ensureCloudinaryConfig = () => {
    const missing = [];

    if (!cloudinaryConfig.cloudName) missing.push('CLOUDINARY_CLOUD_NAME');
    if (!cloudinaryConfig.apiKey) missing.push('CLOUDINARY_API_KEY');
    if (!cloudinaryConfig.apiSecret) missing.push('CLOUDINARY_API_SECRET');

    if (missing.length > 0) {
        throw new AppError(
            `Faltan variables de Cloudinary: ${missing.join(', ')}`,
            500,
            'CLOUDINARY_CONFIG_ERROR'
        );
    }
};

const logCloudinaryError = (error) => {
    logger.error('CLOUDINARY_UPLOAD_ERROR', {
        message: error?.message,
        http_code: error?.http_code,
        details: error
    });
};

const toCloudinaryUploadError = (error) => {
    logCloudinaryError(error);

    return new AppError(
        error?.message || 'Error al subir imagen a Cloudinary',
        error?.http_code || 500,
        'CLOUDINARY_UPLOAD_ERROR',
        error
    );
};

/**
 * Presets de transformacion para diferentes tamanos de imagen
 */
const IMAGE_PRESETS = {
    thumbnail: { width: 150, height: 150, crop: 'fill', quality: 'auto:low', fetch_format: 'auto' },
    small: { width: 400, height: 300, crop: 'limit', quality: 'auto:good', fetch_format: 'auto' },
    medium: { width: 800, height: 600, crop: 'limit', quality: 'auto:good', fetch_format: 'auto' },
    large: { width: 1200, height: 900, crop: 'limit', quality: 'auto:good', fetch_format: 'auto' },
    original: { quality: 'auto:good', fetch_format: 'auto' }
};

const buildUploadOptions = (options = {}) => ({
    folder: options.folder || 'curiel/inspections',
    resource_type: 'image',
    format: 'webp',
    transformation: [
        { quality: 'auto:good' },
        { fetch_format: 'auto' }
    ],
    ...options
});

/**
 * Subir imagen a Cloudinary desde buffer/path/base64
 */
const uploadToCloudinary = (fileInput, options = {}) => {
    ensureCloudinaryConfig();

    return new Promise((resolve, reject) => {
        const uploadOptions = buildUploadOptions(options);

        if (!fileInput) {
            return reject(new AppError('No se recibió archivo', 400, 'NO_FILE'));
        }

        if (typeof fileInput === 'string') {
            cloudinary.uploader
                .upload(fileInput, uploadOptions)
                .then(resolve)
                .catch((error) => reject(toCloudinaryUploadError(error)));
            return;
        }

        if (fileInput.path) {
            cloudinary.uploader
                .upload(fileInput.path, uploadOptions)
                .then(resolve)
                .catch((error) => reject(toCloudinaryUploadError(error)));
            return;
        }

        const fileBuffer = Buffer.isBuffer(fileInput) ? fileInput : fileInput.buffer;

        if (!fileBuffer) {
            return reject(new AppError('No se recibió archivo', 400, 'NO_FILE'));
        }

        const uploadStream = cloudinary.uploader.upload_stream(
            uploadOptions,
            (error, result) => {
                if (error) {
                    return reject(toCloudinaryUploadError(error));
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
        ensureCloudinaryConfig();
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
 * Obtener URL optimizada de imagen con preset predefinido
 */
const getOptimizedUrl = (publicId, options = {}) => {
    const preset = options.preset || 'original';
    const presetConfig = IMAGE_PRESETS[preset] || IMAGE_PRESETS.original;

    return cloudinary.url(publicId, {
        transformation: [presetConfig, ...options.transformations || []]
    });
};

/**
 * Obtener URLs responsivas para diferentes tamanos (srcSet)
 */
const getResponsiveUrls = (publicId) => {
    return Object.entries(IMAGE_PRESETS).reduce((acc, [key, config]) => {
        acc[key] = cloudinary.url(publicId, { transformation: [config] });
        return acc;
    }, {});
};

/**
 * Obtener URL con transformaciones personalizadas
 */
const getTransformedUrl = (publicId, transformations = []) => {
    return cloudinary.url(publicId, {
        transformation: [
            { quality: 'auto:good', fetch_format: 'auto' },
            ...transformations
        ]
    });
};

/**
 * Subir múltiples imágenes
 */
const uploadMultipleToCloudinary = async (files, options = {}) => {
    const uploadPromises = files.map((file) => uploadToCloudinary(file, options));
    return await Promise.all(uploadPromises);
};

module.exports = {
    uploadToCloudinary,
    deleteFromCloudinary,
    getOptimizedUrl,
    getResponsiveUrls,
    getTransformedUrl,
    uploadMultipleToCloudinary,
    IMAGE_PRESETS,
    cloudinary
};
