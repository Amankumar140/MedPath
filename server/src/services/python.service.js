const axios = require('axios');
const env = require('../config/env');
const logger = require('../config/logger');
const { redisClient } = require('../config/redis');

// Instantiate Axios client targeting the Python FastAPI service
const pythonClient = axios.create({
  baseURL: env.PYTHON_SERVICE_URL,
  timeout: 30000, // Centralized timeout: 30s for LLM processing
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for logging (avoiding logging medical data)
pythonClient.interceptors.request.use(
  (config) => {
    logger.debug(`📤 Sending request to Python service: [${config.method.toUpperCase()}] ${config.url}`);
    return config;
  },
  (error) => {
    logger.error('❌ Request error to Python service:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for logging
pythonClient.interceptors.response.use(
  (response) => {
    logger.debug(`📥 Received response from Python service: status ${response.status}`);
    return response;
  },
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url;
    const message = error.message;

    // Log the error but ensure no patient details are stored
    logger.error('❌ Response error from Python service:', {
      message,
      url,
      status,
    });
    return Promise.reject(error);
  }
);

/**
 * Increments a metric in Redis.
 */
async function incrementMetric(key, incrementBy = 1) {
  try {
    if (redisClient.isOpen) {
      await redisClient.incrBy(key, incrementBy);
    }
  } catch (error) {
    logger.error(`Error incrementing metric ${key}:`, error.message);
  }
}

/**
 * Records a value for calculating averages in Redis.
 */
async function recordValueMetric(keySum, keyCount, value) {
  try {
    if (redisClient.isOpen) {
      await redisClient.incrBy(keySum, Math.round(value));
      await redisClient.incrBy(keyCount, 1);
    }
  } catch (error) {
    logger.error(`Error recording value metric ${keySum}:`, error.message);
  }
}

/**
 * Standard retry helper with exponential backoff for streaming/standard requests.
 */
async function requestWithRetryStream(requestFn, retries = 3, delay = 1000, onRetry) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await requestFn();
    } catch (error) {
      const isTimeout = error.code === 'ECONNABORTED' || error.message.includes('timeout');
      const isNetworkError = !error.response;
      const isServerError = error.response && error.response.status >= 500;
      
      const shouldRetry = (isTimeout || isNetworkError || isServerError) && attempt < retries;
      
      if (shouldRetry) {
        logger.warn(`⚠️ Python Service Request failed (attempt ${attempt}/${retries}). Retrying in ${delay}ms... Error: ${error.message}`);
        if (onRetry) onRetry();
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2; // exponential backoff
      } else {
        await incrementMetric('metrics:failure_count');
        if (isTimeout) {
          logger.error(`❌ Python Service Request timed out after ${retries} attempts.`);
          throw new Error(`Python AI service request timed out after ${retries} attempts.`);
        }
        throw error;
      }
    }
  }
}

/**
 * Calls the Python service to get a chat response stream.
 * @param {string} conversationId - The ID of the conversation.
 * @param {string} messageText - The user message text.
 * @returns {Promise<Object>} Stream and metadata.
 */
async function sendMessageStream(conversationId, messageText) {
  const start = Date.now();
  let retryCount = 0;

  const requestFn = async () => {
    return await pythonClient.post('/api/chat', {
      session_id: conversationId,
      user_input: messageText,
    }, {
      responseType: 'stream',
    });
  };

  const response = await requestWithRetryStream(requestFn, 3, 1000, () => {
    retryCount++;
    incrementMetric('metrics:retry_count');
  });

  return {
    responseStream: response.data,
    startTime: start,
    retryCount,
  };
}

/**
 * Health check ping targeting the Python service.
 */
async function getHealth() {
  const start = Date.now();
  try {
    let status = 'DOWN';
    let latency = 0;
    let version = 'unknown';

    try {
      // 1. Try to call /health endpoint
      const res = await pythonClient.get('/health', { timeout: 3000 });
      latency = Date.now() - start;
      status = 'UP';
      version = res.data?.version || '1.0.0';
    } catch (err) {
      if (err.response && err.response.status === 404) {
        // Server returned 404 which means it connected successfully and is up
        latency = Date.now() - start;
        status = 'UP';
      } else {
        // Fallback to checking root endpoint /
        try {
          const startFallback = Date.now();
          await pythonClient.get('/', { timeout: 3000 });
          latency = Date.now() - startFallback;
          status = 'UP';
        } catch (fallbackErr) {
          status = 'DOWN';
          await incrementMetric('metrics:failure_count');
          throw new Error(`Python service is unreachable: ${fallbackErr.message}`);
        }
      }
    }

    // Set first healthy timestamp in Redis if online
    if (status === 'UP' && redisClient.isOpen) {
      const exists = await redisClient.get('metrics:python_uptime_start');
      if (!exists) {
        await redisClient.set('metrics:python_uptime_start', Date.now().toString());
      }
    }

    return {
      status,
      latencyMs: latency,
      version,
    };
  } catch (error) {
    logger.error('❌ Python health check failed:', error.message);
    return {
      status: 'DOWN',
      latencyMs: 0,
      error: error.message,
    };
  }
}

/**
 * Retrieves all tracked system and performance metrics.
 */
async function getSystemMetrics() {
  try {
    if (!redisClient.isOpen) {
      return {
        averageAiLatencyMs: 0,
        averageWorkflowDurationMs: 0,
        failureCount: 0,
        retryCount: 0,
        pythonUptimeSeconds: 0,
      };
    }

    const [aiSum, aiCount, workflowSum, workflowCount, failures, retries, uptimeStart] = await Promise.all([
      redisClient.get('metrics:ai_latency_sum'),
      redisClient.get('metrics:ai_latency_count'),
      redisClient.get('metrics:workflow_duration_sum'),
      redisClient.get('metrics:workflow_duration_count'),
      redisClient.get('metrics:failure_count'),
      redisClient.get('metrics:retry_count'),
      redisClient.get('metrics:python_uptime_start'),
    ]);

    const aiLatencySum = parseInt(aiSum || '0', 10);
    const aiLatencyCount = parseInt(aiCount || '0', 10);
    const workflowDurationSum = parseInt(workflowSum || '0', 10);
    const workflowDurationCount = parseInt(workflowCount || '0', 10);
    
    let pythonUptimeSeconds = 0;
    if (uptimeStart) {
      pythonUptimeSeconds = Math.round((Date.now() - parseInt(uptimeStart, 10)) / 1000);
    }

    return {
      averageAiLatencyMs: aiLatencyCount > 0 ? Math.round(aiLatencySum / aiLatencyCount) : 0,
      averageWorkflowDurationMs: workflowDurationCount > 0 ? Math.round(workflowDurationSum / workflowDurationCount) : 0,
      failureCount: parseInt(failures || '0', 10),
      retryCount: parseInt(retries || '0', 10),
      pythonUptimeSeconds,
    };
  } catch (error) {
    logger.error('Error fetching metrics:', error.message);
    return {
      averageAiLatencyMs: 0,
      averageWorkflowDurationMs: 0,
      failureCount: 0,
      retryCount: 0,
      pythonUptimeSeconds: 0,
    };
  }
}

module.exports = {
  pythonClient,
  sendMessageStream,
  getHealth,
  getSystemMetrics,
  recordValueMetric,
  incrementMetric,
};
