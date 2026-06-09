const { redisClient } = require('../config/redis');
const logger = require('../config/logger');

/**
 * Get value from cache
 * @param {string} key
 * @returns {Promise<any>} Parsed cache value or null if not found/error
 */
async function get(key) {
  try {
    if (!redisClient.isOpen) {
      logger.warn(`⚠️ Cache GET failed: Redis client is not connected. Key: ${key}`);
      return null;
    }
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    logger.error(`❌ Redis error getting key "${key}":`, error);
    return null;
  }
}

/**
 * Set value in cache
 * @param {string} key
 * @param {any} value
 * @param {number} [ttlSeconds] Time to live in seconds
 * @returns {Promise<boolean>} Success status
 */
async function set(key, value, ttlSeconds = null) {
  try {
    if (!redisClient.isOpen) {
      logger.warn(`⚠️ Cache SET failed: Redis client is not connected. Key: ${key}`);
      return false;
    }
    const stringifiedValue = JSON.stringify(value);
    
    if (ttlSeconds) {
      await redisClient.set(key, stringifiedValue, {
        EX: ttlSeconds,
      });
    } else {
      await redisClient.set(key, stringifiedValue);
    }
    return true;
  } catch (error) {
    logger.error(`❌ Redis error setting key "${key}":`, error);
    return false;
  }
}

/**
 * Delete key from cache
 * @param {string} key
 * @returns {Promise<boolean>} Success status
 */
async function del(key) {
  try {
    if (!redisClient.isOpen) {
      logger.warn(`⚠️ Cache DEL failed: Redis client is not connected. Key: ${key}`);
      return false;
    }
    await redisClient.del(key);
    return true;
  } catch (error) {
    logger.error(`❌ Redis error deleting key "${key}":`, error);
    return false;
  }
}

module.exports = {
  get,
  set,
  del,
};
