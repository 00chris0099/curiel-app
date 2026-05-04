/**
 * authMiddleware.js
 * Re-exporta los middlewares de autenticación desde auth.js
 * Este archivo existe por compatibilidad — la lógica real está en auth.js
 */
const { authenticate, authorize, optionalAuth } = require('./auth');

module.exports = {
  authenticate,
  authorize,
  optionalAuth
};
