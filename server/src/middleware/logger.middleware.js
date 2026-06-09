const logger = require('../config/logger');

/**
 * Express middleware to log incoming HTTP requests and response performance using Winston.
 */
function loggerMiddleware(req, res, next) {
  const start = process.hrtime();
  const { method, originalUrl, ip } = req;
  const userAgent = req.get('user-agent') || 'unknown';

  // Attach event listener on response finish to log response details
  res.on('finish', () => {
    const diff = process.hrtime(start);
    const durationMs = (diff[0] * 1e3 + diff[1] * 1e-6).toFixed(2);
    const status = res.statusCode;

    const logMsg = `${method} ${originalUrl} ${status} - ${durationMs}ms - IP: ${ip} - UA: ${userAgent}`;

    const metadata = {
      module: 'http',
      method,
      url: originalUrl,
      status,
      durationMs: parseFloat(durationMs),
      ip,
      userAgent,
    };

    if (status >= 500) {
      logger.error(logMsg, metadata);
    } else if (status >= 400) {
      logger.warn(logMsg, metadata);
    } else {
      logger.info(logMsg, metadata);
    }
  });

  next();
}

module.exports = loggerMiddleware;
