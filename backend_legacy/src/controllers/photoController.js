const { Photo, Inspection, ChecklistItem, User } = require('../models');
const { uploadToCloudinary, deleteFromCloudinary, uploadMultipleToCloudinary } = require('../utils/cloudinary');
const { asyncHandler, AppError } = require('../middlewares/errorHandler');
const { createAuditLog } = require('../middlewares/auditLog');

const safeUserAttributes = {
    exclude: ['passwordHash', '_plainPassword']
};

/**
 * @desc    Subir foto a una inspección
 * @route   POST /api/v1/photos/inspection/:inspectionId
 * @access  Private
 */
const uploadInspectionPhoto = asyncHandler(async (req, res) => {
    const { inspectionId } = req.params;
    const { description, caption, checklistItemId } = req.body;

    if (!req.file) {
        throw new AppError('No se proporcionó ninguna imagen', 400, 'NO_FILE');
    }

    // Verificar que la inspección existe
    const inspection = await Inspection.findByPk(inspectionId);
    if (!inspection) {
        throw new AppError('Inspección no encontrada', 404, 'INSPECTION_NOT_FOUND');
    }

    // Verificar permisos (si es inspector, solo puede subir fotos a sus inspecciones)
    if (!req.user.isMasterAdmin && req.userRole === 'inspector' && inspection.inspectorId !== req.userId) {
        throw new AppError('No tienes permisos para subir fotos a esta inspección', 403, 'FORBIDDEN');
    }

    // Verificar checklistItem si se proporciona
    if (checklistItemId) {
        const checklistItem = await ChecklistItem.findByPk(checklistItemId);
        if (!checklistItem) {
            throw new AppError('Item de checklist no encontrado', 404, 'CHECKLIST_ITEM_NOT_FOUND');
        }
    }

    // Subir a Cloudinary
    const cloudinaryResult = await uploadToCloudinary(req.file.buffer, {
        folder: `curiel/inspections/${inspectionId}`
    });

    // Guardar en la base de datos
    const photo = await Photo.create({
        inspectionId,
        checklistItemId: checklistItemId || null,
        uploadedById: req.userId,
        url: cloudinaryResult.secure_url,
        publicId: cloudinaryResult.public_id,
        caption: description || caption || null
    });

    await createAuditLog(req.userId, 'upload_photo', 'Photo', photo.id, {
        inspectionId,
        checklistItemId
    });

    res.status(201).json({
        success: true,
        message: 'Foto subida exitosamente',
        data: { photo }
    });
});

/**
 * @desc    Subir múltiples fotos a una inspección
 * @route   POST /api/v1/photos/inspection/:inspectionId/multiple
 * @access  Private
 */
const uploadMultipleInspectionPhotos = asyncHandler(async (req, res) => {
    const { inspectionId } = req.params;

    if (!req.files || req.files.length === 0) {
        throw new AppError('No se proporcionaron imágenes', 400, 'NO_FILES');
    }

    // Verificar que la inspección existe
    const inspection = await Inspection.findByPk(inspectionId);
    if (!inspection) {
        throw new AppError('Inspección no encontrada', 404, 'INSPECTION_NOT_FOUND');
    }

    // Verificar permisos (si es inspector, solo puede subir fotos a sus inspecciones)
    if (!req.user.isMasterAdmin && req.userRole === 'inspector' && inspection.inspectorId !== req.userId) {
        throw new AppError('No tienes permisos para subir fotos a esta inspección', 403, 'FORBIDDEN');
    }

    // Subir todas las fotos a Cloudinary
    const cloudinaryResults = await uploadMultipleToCloudinary(req.files, {
        folder: `curiel/inspections/${inspectionId}`
    });

    // Guardar en la base de datos
    const photoPromises = cloudinaryResults.map((result, index) => {
        return Photo.create({
            inspectionId,
            uploadedById: req.userId,
            url: result.secure_url,
            publicId: result.public_id,
            filename: req.files[index].originalname,
            mimeType: req.files[index].mimetype,
            size: req.files[index].size
        });
    });

    const photos = await Promise.all(photoPromises);

    await createAuditLog(req.userId, 'upload_multiple_photos', 'Photo', null, {
        inspectionId,
        count: photos.length
    });

    res.status(201).json({
        success: true,
        message: `${photos.length} fotos subidas exitosamente`,
        data: { photos }
    });
});

/**
 * @desc    Obtener fotos de una inspección
 * @route   GET /api/v1/photos/inspection/:inspectionId
 * @access  Private
 */
const getInspectionPhotos = asyncHandler(async (req, res) => {
    const { inspectionId } = req.params;

    const photos = await Photo.findAll({
        where: { inspectionId },
        include: [
            {
                model: User,
                as: 'uploader',
                attributes: safeUserAttributes
            },
            {
                model: ChecklistItem,
                as: 'checklistItem',
                attributes: ['id', 'itemText', 'category']
            }
        ],
        order: [['createdAt', 'DESC']]
    });

    res.json({
        success: true,
        data: { photos, count: photos.length }
    });
});

/**
 * @desc    Obtener foto por ID
 * @route   GET /api/v1/photos/:id
 * @access  Private
 */
const getPhotoById = asyncHandler(async (req, res) => {
    const photo = await Photo.findByPk(req.params.id, {
        include: [
            {
                model: User,
                as: 'uploader',
                attributes: safeUserAttributes
            },
            {
                model: Inspection,
                as: 'inspection',
                attributes: ['id', 'projectName', 'status']
            }
        ]
    });

    if (!photo) {
        throw new AppError('Foto no encontrada', 404, 'PHOTO_NOT_FOUND');
    }

    res.json({
        success: true,
        data: { photo }
    });
});

/**
 * @desc    Actualizar descripción de foto
 * @route   PUT /api/v1/photos/:id
 * @access  Private
 */
const updatePhoto = asyncHandler(async (req, res) => {
    const { description, caption } = req.body;

    const photo = await Photo.findByPk(req.params.id);

    if (!photo) {
        throw new AppError('Foto no encontrada', 404, 'PHOTO_NOT_FOUND');
    }

    // Verificar permisos
    if (photo.uploadedById !== req.userId && !(req.userRole === 'admin' || req.user.isMasterAdmin)) {
        throw new AppError('No tienes permisos para editar esta foto', 403, 'FORBIDDEN');
    }

    photo.caption = description || caption || null;
    await photo.save();

    await createAuditLog(req.userId, 'update_photo', 'Photo', photo.id, {
        caption: photo.caption
    });

    res.json({
        success: true,
        message: 'Foto actualizada exitosamente',
        data: { photo }
    });
});

/**
 * @desc    Eliminar foto
 * @route   DELETE /api/v1/photos/:id
 * @access  Private
 */
const deletePhoto = asyncHandler(async (req, res) => {
    const photo = await Photo.findByPk(req.params.id);

    if (!photo) {
        throw new AppError('Foto no encontrada', 404, 'PHOTO_NOT_FOUND');
    }

    // Verificar permisos
    if (photo.uploadedById !== req.userId && !(req.userRole === 'admin' || req.user.isMasterAdmin)) {
        throw new AppError('No tienes permisos para eliminar esta foto', 403, 'FORBIDDEN');
    }

    // Eliminar de Cloudinary
    if (photo.publicId) {
        await deleteFromCloudinary(photo.publicId);
    }

    // Eliminar de la base de datos
    await photo.destroy();

    await createAuditLog(req.userId, 'delete_photo', 'Photo', photo.id, {
        inspectionId: photo.inspectionId
    });

    res.json({
        success: true,
        message: 'Foto eliminada exitosamente'
    });
});

module.exports = {
    uploadInspectionPhoto,
    uploadMultipleInspectionPhotos,
    getInspectionPhotos,
    getPhotoById,
    updatePhoto,
    deletePhoto
};
