import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';

/**
 * Presets de compresion para diferentes usos
 */
const COMPRESSION_PRESETS = {
    thumbnail: { width: 150, height: 150, quality: 0.6 },
    small: { width: 400, height: 300, quality: 0.7 },
    medium: { width: 800, height: 600, quality: 0.8 },
    large: { width: 1200, height: 900, quality: 0.85 },
    original: { quality: 0.8 }
};

/**
 * Comprimir y redimensionar imagen
 * @param {string} uri - URI de la imagen original
 * @param {string} preset - Nombre del preset ('thumbnail', 'small', 'medium', 'large', 'original')
 * @returns {Promise<{uri: string, width: number, height: number, size: number}>}
 */
export const compressImage = async (uri, preset = 'medium') => {
    const config = COMPRESSION_PRESETS[preset] || COMPRESSION_PRESETS.medium;

    try {
        const actions = [];

        if (config.width && config.height) {
            actions.push({
                resize: { width: config.width, height: config.height }
            });
        }

        const result = await ImageManipulator.manipulateAsync(
            uri,
            actions,
            {
                compress: config.quality,
                format: ImageManipulator.SaveFormat.WEBP
            }
        );

        const fileInfo = await FileSystem.getInfoAsync(result.uri);

        return {
            uri: result.uri,
            width: result.width,
            height: result.height,
            size: fileInfo.size || 0
        };
    } catch (error) {
        console.error('Error comprimiendo imagen:', error);
        throw error;
    }
};

/**
 * Obtener tamaño de archivo legible
 * @param {number} bytes - Tamaño en bytes
 * @returns {string}
 */
export const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

/**
 * Calcular ahorro de espacio
 * @param {number} originalSize - Tamaño original en bytes
 * @param {number} compressedSize - Tamaño comprimido en bytes
 * @returns {string}
 */
export const calculateSavings = (originalSize, compressedSize) => {
    if (originalSize <= 0) return '0%';
    const savings = ((originalSize - compressedSize) / originalSize) * 100;
    return `${savings.toFixed(1)}%`;
};
