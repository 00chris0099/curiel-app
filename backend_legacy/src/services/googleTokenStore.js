const logger = require('../utils/logger');

const tokensByUserId = new Map();

function saveTokens(userId, tokens) {
    tokensByUserId.set(userId, {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiryDate: tokens.expiry_date,
        scope: tokens.scope,
        tokenType: tokens.token_type,
        savedAt: Date.now()
    });
    logger.info('[GoogleTokens] Tokens saved', { userId });
}

function getTokens(userId) {
    const tokens = tokensByUserId.get(userId);
    if (!tokens) return null;

    if (tokens.expiryDate && Date.now() > tokens.expiryDate - 60000) {
        logger.info('[GoogleTokens] Token expired, needs refresh', { userId });
        return { ...tokens, expired: true };
    }

    return tokens;
}

function removeTokens(userId) {
    tokensByUserId.delete(userId);
    logger.info('[GoogleTokens] Tokens removed', { userId });
}

module.exports = { saveTokens, getTokens, removeTokens };
