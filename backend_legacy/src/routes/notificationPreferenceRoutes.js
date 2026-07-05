const express = require('express');
const { authenticate } = require('../middlewares/auth');
const notificationPreferenceController = require('../controllers/notificationPreferenceController');

const router = express.Router();

router.use(authenticate);

router.get('/', notificationPreferenceController.getPreference);
router.put('/', notificationPreferenceController.updatePreference);

module.exports = router;
