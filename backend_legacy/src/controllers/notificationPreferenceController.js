const notificationPreferenceService = require('../services/notificationPreferenceService');
const { asyncHandler } = require('../middlewares/errorHandler');

const getPreference = asyncHandler(async (req, res) => {
    const preference = await notificationPreferenceService.getPreference(req.userId);

    res.json({
        success: true,
        data: preference
    });
});

const updatePreference = asyncHandler(async (req, res) => {
    const { emailEnabled, pushEnabled, inAppEnabled, categories, quietHoursStart, quietHoursEnd } = req.body;

    const data = {};
    if (emailEnabled !== undefined) data.emailEnabled = Boolean(emailEnabled);
    if (pushEnabled !== undefined) data.pushEnabled = Boolean(pushEnabled);
    if (inAppEnabled !== undefined) data.inAppEnabled = Boolean(inAppEnabled);
    if (categories !== undefined) data.categories = categories;
    if (quietHoursStart !== undefined) data.quietHoursStart = quietHoursStart || null;
    if (quietHoursEnd !== undefined) data.quietHoursEnd = quietHoursEnd || null;

    const preference = await notificationPreferenceService.updatePreference(req.userId, data);

    res.json({
        success: true,
        data: preference
    });
});

module.exports = {
    getPreference,
    updatePreference
};
