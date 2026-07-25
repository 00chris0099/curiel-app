const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth');
const pdfDraftController = require('../controllers/pdfDraftController');

router.use(authenticate);

router.get('/:id/pdf-draft', pdfDraftController.getDraft);
router.post('/:id/pdf-draft', pdfDraftController.saveDraft);

router.get('/:id/pdf-versions', pdfDraftController.getVersions);
router.post('/:id/pdf-versions', pdfDraftController.createVersion);
router.post('/:id/pdf-versions/:version/restore', pdfDraftController.restoreVersion);

module.exports = router;
