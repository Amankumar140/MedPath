const app = require('./app');
const env = require('./config/env');
const logger = require('./config/logger');
const { connectDb, disconnectDb } = require('./config/database');
const { connectRedis, disconnectRedis } = require('./config/redis');

// Initialize Firebase Admin SDK (triggers initialization block in config/firebase.js)
require('./config/firebase');

let server;

async function bootstrap() {
  logger.info('🚀 Starting MedPath Backend server bootstrap...');

  // 1. Establish Database Connection
  await connectDb();

  // 2. Establish Redis Cache Connection
  await connectRedis();

  // 3. Start Express HTTP Server
  const PORT = env.PORT;
  server = app.listen(PORT, () => {
    logger.info(`✨ Server running in [${env.NODE_ENV}] mode on http://localhost:${PORT}`);
    logger.info(`📖 API documentation available at http://localhost:${PORT}/api-docs`);
  });

  // 4. Handle System Termination Signals
  const gracefulShutdown = async (signal) => {
    logger.info(`🔌 Received ${signal}. Starting graceful shutdown...`);

    if (server) {
      server.close(() => {
        logger.info('🔌 Express HTTP server closed');
      });
    }

    // Disconnect cache and database
    await disconnectRedis();
    await disconnectDb();

    logger.info('👋 Graceful shutdown complete. Exiting process.');
    process.exit(0);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('❌ Unhandled Rejection at Promise:', { promise, reason });
  });

  process.on('uncaughtException', (error) => {
    logger.error('❌ Uncaught Exception thrown:', error);
    // Graceful exit to allow process manager to restart
    gracefulShutdown('UNCAUGHT_EXCEPTION');
  });
}

bootstrap();
