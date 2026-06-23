const cloudinary = require('cloudinary').v2;
const config = require('../config');
const logger = require('./logger');

cloudinary.config({
    cloud_name: config.cloudinary.cloudName,
    api_key: config.cloudinary.apiKey,
    api_secret: config.cloudinary.apiSecret,
});

/**
 * Upload a PDF buffer to Cloudinary
 * @param {Buffer} buffer - PDF buffer
 * @param {string} filename - filename without extension
 * @returns {{ url: string, publicId: string, expiresAt: string }}
 */
const uploadPdf = async (buffer, filename) => {
    return new Promise((resolve, reject) => {
        const sanitized = filename
            .replace(/[^a-zA-Z0-9_-]/g, '_')
            .slice(0, 100);

        const publicId = `curiel/reports/${sanitized}-${Date.now()}`;

        const stream = cloudinary.uploader.upload_stream(
            {
                resource_type: 'raw',
                public_id: publicId,
                format: 'pdf',
                type: 'upload',
                access_control: [
                    {
                        access_type: 'anonymous',
                        start: Math.floor(Date.now() / 1000),
                        end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
                    }
                ],
            },
            (error, result) => {
                if (error) {
                    logger.error('CLOUDINARY_UPLOAD_ERROR', { error: error.message });
                    return reject(error);
                }

                const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
                logger.info('PDF uploaded to Cloudinary', { publicId, url: result.secure_url });

                resolve({
                    url: result.secure_url,
                    publicId: result.public_id,
                    expiresAt,
                });
            }
        );

        stream.end(buffer);
    });
};

/**
 * Generate a signed download URL for an existing Cloudinary resource
 * @param {string} publicId
 * @param {number} expiresInDays - default 30
 * @returns {string}
 */
const getSignedUrl = (publicId, expiresInDays = 30) => {
    const expiresAt = Math.floor(Date.now() / 1000) + expiresInDays * 24 * 60 * 60;
    return cloudinary.url(publicId, {
        resource_type: 'raw',
        sign_url: true,
        secure: true,
        expires_at: expiresAt,
    });
};

module.exports = { uploadPdf, getSignedUrl, cloudinary };
