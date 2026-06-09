/**
 * Authentication Middleware
 * Re-exports the production Firebase token verification middleware.
 * Any module importing from this path will receive the same middleware
 * that verifies tokens, checks user existence, and validates active status.
 */
const { verifyFirebaseToken } = require('../modules/auth/auth.middleware');

module.exports = verifyFirebaseToken;
