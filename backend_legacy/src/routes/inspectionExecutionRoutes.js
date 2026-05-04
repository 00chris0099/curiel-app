const express = require('express');
const inspectionExecutionController = require('../controllers/inspectionExecutionController');
const { uploadSingle } = require('../middlewares/upload');

const router = express.Router({ mergeParams: true });

router.get('/', inspectionExecutionController.getInspectionExecution);
router.post('/areas/default', inspectionExecutionController.createDefaultAreas);
router.post('/areas', inspectionExecutionController.createArea);
router.put('/areas/:areaId', inspectionExecutionController.updateArea);
router.delete('/areas/:areaId', inspectionExecutionController.deleteArea);
router.post('/observations', inspectionExecutionController.createObservation);
router.put('/observations/:observationId', inspectionExecutionController.updateObservation);
router.delete('/observations/:observationId', inspectionExecutionController.deleteObservation);
router.post('/photos', uploadSingle, inspectionExecutionController.createPhoto);
router.put('/summary', inspectionExecutionController.updateSummary);
router.post('/complete', inspectionExecutionController.completeInspection);

module.exports = router;
