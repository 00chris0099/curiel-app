const { prisma } = require('../lib/databases');
const { uploadToCloudinary, deleteFromCloudinary, uploadMultipleToCloudinary } = require('../utils/cloudinary');
const { asyncHandler, AppError } = require('../middlewares/errorHandler');
const { createAuditLog } = require('../middlewares/auditLog');

const uploadInspectionPhoto = asyncHandler(async (req, res) => {
    const { inspectionId } = req.params;
    const { description, caption, checklistItemId } = req.body;

    if (!req.file) {
        throw new AppError('No se recibió archivo', 400, 'NO_FILE');
    }

    const inspection = await prisma.inspecciones.inspection.findUnique({
        where: { id: inspectionId }
    });
    if (!inspection) {
        throw new AppError('Inspección no encontrada', 404, 'INSPECTION_NOT_FOUND');
    }

    if (!req.user.isMasterAdmin && req.userRole === 'inspector' && inspection.inspectorId !== req.userId) {
        throw new AppError('No tienes permisos para subir fotos a esta inspección', 403, 'FORBIDDEN');
    }

    if (checklistItemId) {
        const item = await prisma.admin.checklistItem.findUnique({ where: { id: checklistItemId } });
        if (!item) {
            throw new AppError('Item de checklist no encontrado', 404, 'CHECKLIST_ITEM_NOT_FOUND');
        }
    }

    const cloudinaryResult = await uploadToCloudinary(req.file, {
        folder: `curiel/inspections/${inspectionId}`
    });

    const photo = await prisma.media.photo.create({
        data: {
            inspectionId,
            checklistItemId: checklistItemId || null,
            uploadedById: req.userId,
            url: cloudinaryResult.secure_url,
            publicId: cloudinaryResult.public_id,
            caption: description || caption || null,
            type: 'general'
        }
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

const uploadMultipleInspectionPhotos = asyncHandler(async (req, res) => {
    const { inspectionId } = req.params;

    if (!req.files || req.files.length === 0) {
        throw new AppError('No se proporcionaron imágenes', 400, 'NO_FILES');
    }

    const inspection = await prisma.inspecciones.inspection.findUnique({
        where: { id: inspectionId }
    });
    if (!inspection) {
        throw new AppError('Inspección no encontrada', 404, 'INSPECTION_NOT_FOUND');
    }

    if (!req.user.isMasterAdmin && req.userRole === 'inspector' && inspection.inspectorId !== req.userId) {
        throw new AppError('No tienes permisos para subir fotos a esta inspección', 403, 'FORBIDDEN');
    }

    const cloudinaryResults = await uploadMultipleToCloudinary(req.files, {
        folder: `curiel/inspections/${inspectionId}`
    });

    await prisma.media.photo.createMany({
        data: cloudinaryResults.map((result, index) => ({
            inspectionId,
            uploadedById: req.userId,
            url: result.secure_url,
            publicId: result.public_id,
            type: 'general'
        }))
    });

    const photos = await prisma.media.photo.findMany({
        where: { inspectionId },
        orderBy: { createdAt: 'desc' },
        take: cloudinaryResults.length
    });

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

const getInspectionPhotos = asyncHandler(async (req, res) => {
    const { inspectionId } = req.params;

    const photos = await prisma.media.photo.findMany({
        where: { inspectionId },
        orderBy: { createdAt: 'desc' }
    });

    res.json({
        success: true,
        data: { photos, count: photos.length }
    });
});

const getPhotoById = asyncHandler(async (req, res) => {
    const photo = await prisma.media.photo.findUnique({
        where: { id: req.params.id }
    });

    if (!photo) {
        throw new AppError('Foto no encontrada', 404, 'PHOTO_NOT_FOUND');
    }

    res.json({
        success: true,
        data: { photo }
    });
});

const updatePhoto = asyncHandler(async (req, res) => {
    const { description, caption } = req.body;

    const photo = await prisma.media.photo.findUnique({
        where: { id: req.params.id }
    });

    if (!photo) {
        throw new AppError('Foto no encontrada', 404, 'PHOTO_NOT_FOUND');
    }

    if (photo.uploadedById !== req.userId && !(req.userRole === 'admin' || req.user.isMasterAdmin)) {
        throw new AppError('No tienes permisos para editar esta foto', 403, 'FORBIDDEN');
    }

    const updated = await prisma.media.photo.update({
        where: { id: req.params.id },
        data: { caption: description || caption || null }
    });

    await createAuditLog(req.userId, 'update_photo', 'Photo', photo.id, {
        caption: updated.caption
    });

    res.json({
        success: true,
        message: 'Foto actualizada exitosamente',
        data: { photo: updated }
    });
});

const deletePhoto = asyncHandler(async (req, res) => {
    const photo = await prisma.media.photo.findUnique({
        where: { id: req.params.id }
    });

    if (!photo) {
        throw new AppError('Foto no encontrada', 404, 'PHOTO_NOT_FOUND');
    }

    if (photo.uploadedById !== req.userId && !(req.userRole === 'admin' || req.user.isMasterAdmin)) {
        throw new AppError('No tienes permisos para eliminar esta foto', 403, 'FORBIDDEN');
    }

    if (photo.publicId) {
        await deleteFromCloudinary(photo.publicId);
    }

    await prisma.media.photo.delete({ where: { id: req.params.id } });

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
