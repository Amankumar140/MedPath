const firebaseAdmin = require('../../config/firebase');
const userRepository = require('../users/user.repository');
const logger = require('../../config/logger');

/**
 * Middleware to authenticate requests using Firebase ID Tokens.
 * Reads Bearer token, verifies it, checks if the user exists and is active in DB,
 * and attaches the user record to req.user.
 */
async function verifyFirebaseToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn('🔓 verifyFirebaseToken: Missing or malformed Authorization header');
      return res.status(401).json({
        success: false,
        error: {
          message: 'Unauthorized: Missing or malformed Authorization header',
          statusCode: 401,
        },
      });
    }

    const token = authHeader.split(' ')[1];
    
    if (!firebaseAdmin) {
      logger.error('🔓 verifyFirebaseToken: Firebase Admin SDK is not initialized');
      return res.status(500).json({
        success: false,
        error: {
          message: 'Internal Server Error: Authentication configuration issue',
          statusCode: 500,
        },
      });
    }

    let decodedToken;
    try {
      decodedToken = await firebaseAdmin.auth().verifyIdToken(token);
    } catch (err) {
      logger.warn(`🔓 verifyFirebaseToken: Token verification failed: ${err.message}`);
      return res.status(401).json({
        success: false,
        error: {
          message: 'Unauthorized: Invalid or expired Firebase ID token',
          statusCode: 401,
        },
      });
    }

    const firebaseUid = decodedToken.uid;
    const user = await userRepository.findByFirebaseUid(firebaseUid);

    if (!user) {
      logger.warn(`🔓 verifyFirebaseToken: Firebase UID ${firebaseUid} verified, but no database profile exists`);
      return res.status(401).json({
        success: false,
        error: {
          message: 'Unauthorized: User profile does not exist',
          statusCode: 401,
        },
      });
    }

    if (!user.isActive) {
      logger.warn(`🔓 verifyFirebaseToken: User ${user.id} (${firebaseUid}) is inactive/deactivated`);
      return res.status(403).json({
        success: false,
        error: {
          message: 'Forbidden: User account is deactivated',
          statusCode: 403,
        },
      });
    }

    // Attach user record to request object
    req.user = user;
    next();
  } catch (error) {
    logger.error('🔓 verifyFirebaseToken: Unexpected middleware error:', error);
    next(error);
  }
}

module.exports = {
  verifyFirebaseToken,
};
