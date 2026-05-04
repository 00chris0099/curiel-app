const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth');
const { uploadSingle, uploadMultiple } = require('../middlewares/upload');
const photoController = require('../controllers/photoController');

// Todas las rutas requieren autenticación
router.use(authenticate);

// POST /api/v1/photos/inspection/:inspectionId - Subir foto individual
router.post(
    '/inspection/:inspectionId',
    uploadSingle,
    photoController.uploadInspectionPhoto
);

// POST /api/v1/photos/inspection/:inspectionId/multiple - Subir múltiples fotos
router.post(
    '/inspection/:inspectionId/multiple',
    uploadMultiple,
    photoController.uploadMultipleInspectionPhotos
);

// GET /api/v1/photos/inspection/:inspectionId - Obtener fotos de inspección
router.get(
    '/inspection/:inspectionId',
    photoController.getInspectionPhotos
);

// GET /api/v1/photos/:id - Obtener foto por ID
router.get('/:id', photoController.getPhotoById);

// PUT /api/v1/photos/:id - Actualizar foto
router.put('/:id', photoController.updatePhoto);

// DELETE /api/v1/photos/:id - Eliminar foto
router.delete('/:id', photoController.deletePhoto);

module.exports = router;
