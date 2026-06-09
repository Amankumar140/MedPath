const { ZodError } = require('zod');
const logger = require('../config/logger');
const env = require('../config/env');

/**
 * Global centralized error handling middleware.
 */
function errorMiddleware(err, req, res, next) {
  // If headers have already been sent, delegate to the default Express error handler
  if (res.headersSent) {
    return next(err);
  }

  const isProduction = env.NODE_ENV === 'production';
  let statusCode = err.status || err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let details = null;

  // Handle Zod Validation Errors
  if (err instanceof ZodError) {
    statusCode = 400;
    message = 'Validation Error';
    details = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
  }

  // Log error using Winston
  logger.error(`${req.method} ${req.originalUrl} - Error: ${message}`, {
    statusCode,
    stack: err.stack,
    details,
  });

  // Construct standardized error response
  res.status(statusCode).json({
    success: false,
    error: {
      message,
      statusCode,
      ...(details && { details }),
      ...(!isProduction && !err.errors && { stack: err.stack }), // Output stack trace if not in production
    },
  });
}

module.exports = errorMiddleware;
