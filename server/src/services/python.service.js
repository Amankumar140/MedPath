const axios = require('axios');
const env = require('../config/env');
const logger = require('../config/logger');
const { redisClient } = require('../config/redis');

// Instantiate Axios client targeting the Python FastAPI service
// Instantiate Axios client targeting the Python FastAPI service
const pythonClient = axios.create({
  baseURL: env.PYTHON_SERVICE_URL,
  timeout: 180000, // Centralized timeout: 30s for LLM processing
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for detailed diagnostic logging
pythonClient.interceptors.request.use(
  (config) => {
    const absoluteUrl = config.baseURL 
      ? (config.baseURL.endsWith('/') ? config.baseURL.slice(0, -1) : config.baseURL) + config.url 
      : config.url;
      
    logger.info('📤 [Axios Request Details]');
    logger.info(`🔗 URL: [${config.method.toUpperCase()}] ${absoluteUrl}`);
    logger.info(`📋 Headers: ${JSON.stringify(config.headers)}`);
    logger.info(`📦 Payload: ${JSON.stringify(config.data)}`);
    return config;
  },
  (error) => {
    logger.error('❌ Request compilation error to Python service:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for detailed diagnostic logging
pythonClient.interceptors.response.use(
  (response) => {
    logger.info(`📥 Received response from Python service: status ${response.status}`);
    return response;
  },
  (error) => {
    logger.error('❌ [Axios Response Error Details]');
    logger.error(`Message: ${error.message}`);
    logger.error(`Code: ${error.code}`);
    logger.error(`Response Status: ${error.response?.status}`);
    logger.error(`Response Headers: ${JSON.stringify(error.response?.headers)}`);
    logger.error(`Response Data: ${JSON.stringify(error.response?.data)}`);
    logger.error(`Stack: ${error.stack}`);
    logger.error(`Config URL: ${error.config?.url}`);
    logger.error(`Config Method: ${error.config?.method}`);
    logger.error(`Config Headers: ${JSON.stringify(error.config?.headers)}`);
    logger.error(`Config Data: ${JSON.stringify(error.config?.data)}`);
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

  const disableStreaming = process.env.DISABLE_STREAMING_REQUESTS === 'true';
  const responseType = disableStreaming ? 'json' : 'stream';

  const requestFn = async () => {
    return await pythonClient.post('/api/chat', {
      session_id: conversationId,
      user_input: messageText,
    }, {
      responseType,
    });
  };

  const response = await requestWithRetryStream(requestFn, 3, 1000, () => {
    retryCount++;
    incrementMetric('metrics:retry_count');
  });

  let responseStream;
  if (!disableStreaming) {
    responseStream = response.data;
  } else {
    // Convert normal response data to a stream so the caller doesn't break
    const { PassThrough } = require('stream');
    responseStream = new PassThrough();
    const dataStr = typeof response.data === 'object' ? JSON.stringify(response.data) : response.data;
    responseStream.write(dataStr);
    responseStream.end();
  }

  return {
    responseStream,
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
