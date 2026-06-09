const logger = require('../config/logger');

/**
 * Fallback middleware for handling 404 Not Found requests.
 */
function notFoundMiddleware(req, res, next) {
  logger.warn(`🔍 404 Not Found: ${req.method} ${req.originalUrl}`);
  
  res.status(404).json({
    success: false,
    error: {
      message: `Cannot ${req.method} ${req.originalUrl} - Route not found`,
      statusCode: 404,
    },
  });
}

module.exports = notFoundMiddleware;
