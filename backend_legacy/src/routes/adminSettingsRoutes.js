const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authenticate, authorize } = require('../middlewares/auth');
const { asyncHandler, AppError } = require('../middlewares/errorHandler');
const adminSignatureService = require('../services/adminSignatureService');

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'image/png') {
            cb(null, true);
        } else {
            cb(new AppError('Solo se aceptan archivos PNG', 400, 'INVALID_FILE_TYPE'));
        }
    }
});

router.use(authenticate);
router.use(authorize('admin'));

router.get('/signature', asyncHandler(async (req, res) => {
    const signature = await adminSignatureService.getSignature();
    res.json({ success: true, data: signature });
}));

router.put('/signature', upload.single('signature'), asyncHandler(async (req, res) => {
    if (!req.file) {
        throw new AppError('Debe proporcionar un archivo PNG', 400, 'FILE_REQUIRED');
    }
    const signature = await adminSignatureService.uploadSignature(req.file, req.userId);
    res.json({ success: true, data: signature, message: 'Firma actualizada correctamente' });
}));

router.delete('/signature', asyncHandler(async (req, res) => {
    await adminSignatureService.deleteSignature();
    res.json({ success: true, message: 'Firma eliminada correctamente' });
}));

module.exports = router;
