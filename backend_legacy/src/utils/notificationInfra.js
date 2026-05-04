const { Notification } = require('../models');

let ensureNotificationInfraPromise = null;

const ensureNotificationInfra = async () => {
    if (!ensureNotificationInfraPromise) {
        ensureNotificationInfraPromise = Notification.sync().catch((error) => {
            ensureNotificationInfraPromise = null;
            throw error;
        });
    }

    return ensureNotificationInfraPromise;
};

module.exports = {
    ensureNotificationInfra
};
