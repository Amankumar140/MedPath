const { createClient } = require('redis');
const logger = require('./logger');
const env = require('./env');

const redisClient = createClient({
  url: env.REDIS_URL,
  socket: {
    reconnectStrategy: (retries) => {
      if (retries >= 3) {
        logger.warn('⚠️ Redis connection attempts exhausted. Cache will remain disabled.');
        return new Error('Redis connection failed');
      }
      // Exponential backoff or standard delay
      return 1000; // Wait 1 second before retrying
    },
  },
});

redisClient.on('connect', () => {
  logger.info('🚀 Connecting to Redis...');
});

redisClient.on('ready', () => {
  logger.info('🚀 Redis client ready and connected successfully');
});

redisClient.on('error', (err) => {
  logger.error('❌ Redis Client Error:', err);
});

redisClient.on('end', () => {
  logger.info('🔌 Redis connection closed');
});

async function connectRedis() {
  try {
    await redisClient.connect();
  } catch (error) {
    logger.error('❌ Failed to establish Redis connection:', error);
    // Don't crash process instantly, allow system to function if cache is optional,
    // but log the critical issue.
  }
}

async function disconnectRedis() {
  if (redisClient.isOpen) {
    try {
      await redisClient.quit();
      logger.info('🔌 Redis client disconnected gracefully');
    } catch (error) {
      logger.error('❌ Error during Redis disconnection:', error);
    }
  }
}

module.exports = {
  redisClient,
  connectRedis,
  disconnectRedis,
};
