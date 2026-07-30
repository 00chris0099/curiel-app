const express = require('express');
const jwt = require('jsonwebtoken');
const { google } = require('googleapis');
const { saveTokens, getTokens } = require('../services/googleTokenStore');
const logger = require('../utils/logger');

const router = express.Router();

const SCOPES = [
    'https://www.googleapis.com/auth/documents',
    'https://www.googleapis.com/auth/drive'
];

function getOAuth2Client() {
    return new google.auth.OAuth2(
        process.env.GOOGLE_O_CLIENT_ID,
        process.env.GOOGLE_O_CLIENT_SECRET,
        process.env.GOOGLE_O_REDIRECT_URI
    );
}

router.get('/google', async (req, res) => {
    try {
        let userId = null;

        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            try {
                const decoded = jwt.verify(authHeader.substring(7), process.env.JWT_SECRET);
                userId = decoded.userId;
            } catch (jwtErr) {
                logger.debug('[GoogleAuth] JWT from header invalid', { error: jwtErr.message });
            }
        }

        if (!userId && req.query.token) {
            try {
                const decoded = jwt.verify(req.query.token, process.env.JWT_SECRET);
                userId = decoded.userId;
            } catch (jwtErr) {
                logger.debug('[GoogleAuth] JWT from query invalid', { error: jwtErr.message });
            }
        }

        if (!userId) {
            return res.status(401).json({ success: false, error: { message: 'No autenticado' } });
        }

        const oauth2Client = getOAuth2Client();
        const inspectionId = req.query.inspectionId || '';
        const url = oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: SCOPES,
            state: `${userId}:${inspectionId}`,
            prompt: 'consent'
        });
        res.redirect(url);
    } catch (err) {
        logger.error('[GoogleAuth] Error generating auth URL', { error: err.message });
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        res.redirect(`${frontendUrl}/inspections?error=google_auth_failed`);
    }
});

router.get('/google/callback', async (req, res) => {
    const { code, state, error } = req.query;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    if (error) {
        logger.warn('[GoogleAuth] OAuth denied by user', { error });
        res.redirect(`${frontendUrl}/inspections?error=google_auth_denied`);
        return;
    }

    if (!code || !state) {
        res.redirect(`${frontendUrl}/inspections?error=google_auth_missing_code`);
        return;
    }

    const [userId, inspectionId] = state.split(':');

    try {
        const oauth2Client = getOAuth2Client();
        const { tokens } = await oauth2Client.getToken(code);
        saveTokens(userId, tokens);

        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const redirectUrl = `${frontendUrl}/inspections${inspectionId ? '/' + inspectionId : ''}?google_auth=success`;
        res.redirect(redirectUrl);
    } catch (err) {
        logger.error('[GoogleAuth] Error exchanging code', { error: err.message });
        res.redirect(`${frontendUrl}/inspections?error=google_auth_exchange_failed`);
    }
});

router.get('/google/status', async (req, res) => {
    try {
        let userId = null;
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const decoded = jwt.verify(authHeader.substring(7), process.env.JWT_SECRET);
            userId = decoded.userId;
        }
        if (!userId) {
            return res.json({ success: true, data: { authenticated: false } });
        }
        const tokens = getTokens(userId);
        res.json({ success: true, data: { authenticated: !!tokens } });
    } catch (err) {
        logger.debug('[GoogleAuth] Status check failed', { error: err.message });
        res.json({ success: true, data: { authenticated: false } });
    }
});

module.exports = router;
