const config = require('../config');

const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY;

const internalAuth = (req, res, next) => {
    if (!INTERNAL_API_KEY) {
        return next();
    }

    const providedKey = req.headers['x-internal-api-key'];

    if (providedKey && providedKey === INTERNAL_API_KEY) {
        req.user = {
            id: 'internal-n8n',
            email: 'n8n@curiel.local',
            fullName: 'n8n Automation',
            isActive: true,
            isMasterAdmin: true,
        };
        req.userId = 'internal-n8n';
        req.userRoles = ['admin'];
        req.userRole = 'admin';
        req.isMasterAdmin = true;
        return next();
    }

    return next();
};

module.exports = { internalAuth };
