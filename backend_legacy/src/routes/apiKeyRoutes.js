const express = require('express');
const { authenticate, authorize } = require('../middlewares/auth');
const apiKeyController = require('../controllers/apiKeyController');

const router = express.Router();

router.get('/', authenticate, authorize('admin'), apiKeyController.getAllKeys);
router.get('/:id', authenticate, authorize('admin'), apiKeyController.getKeyById);
router.post('/', authenticate, authorize('admin'), apiKeyController.createKey);
router.put('/:id', authenticate, authorize('admin'), apiKeyController.updateKey);
router.post('/:id/revoke', authenticate, authorize('admin'), apiKeyController.revokeKey);
router.delete('/:id', authenticate, authorize('admin'), apiKeyController.deleteKey);

module.exports = router;
