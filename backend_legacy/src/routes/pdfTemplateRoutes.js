const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middlewares/auth');
const pdfTemplateController = require('../controllers/pdfTemplateController');
const validateJoi = require('../middlewares/validateJoi');
const { createTemplateSchema, updateTemplateSchema } = require('../validators/pdfTemplateValidator');

router.use(authenticate);

router.get('/', pdfTemplateController.getAllTemplates);
router.get('/:id', pdfTemplateController.getTemplateById);
router.post('/', authorize('admin', 'arquitecto'), validateJoi(createTemplateSchema), pdfTemplateController.createTemplate);
router.put('/:id', authorize('admin', 'arquitecto'), validateJoi(updateTemplateSchema), pdfTemplateController.updateTemplate);
router.delete('/:id', authorize('admin', 'arquitecto'), pdfTemplateController.deleteTemplate);

module.exports = router;
