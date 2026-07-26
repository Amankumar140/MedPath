const axios = require('axios');
const env = require('../config/env');
const logger = require('../config/logger');
const { redisClient } = require('../config/redis');
const { PassThrough } = require('stream');

// Redacts sensitive clinical fields to satisfy the OpenAPI privacy guidelines
function redactSensitiveData(data) {
  if (!data) return data;
  try {
    const copy = JSON.parse(JSON.stringify(data));
    const redact = (obj) => {
      if (!obj || typeof obj !== 'object') return;
      
      const sensitiveFields = ['symptoms', 'medical_history', 'current_medications', 'allergies', 'raw_message', 'message'];
      for (const field of sensitiveFields) {
        if (field in obj) {
          obj[field] = '[REDACTED]';
        }
      }
      
      for (const key in obj) {
        if (typeof obj[key] === 'object') {
          redact(obj[key]);
        }
      }
    };
    redact(copy);
    return copy;
  } catch (e) {
    return '[Unable to serialize/redact log payload]';
  }
}

// Sanitizes Axios errors by stripping out request/response objects that could contain sensitive client/patient data
function sanitizeAxiosError(error) {
  if (!error) return error;

  const status = error.response?.status || 500;
  const message = error.response?.data?.message || error.message || 'Swasthya API Error';
  
  const cleanError = new Error(message);
  cleanError.status = status;
  cleanError.statusCode = status;
  
  if (error.code) {
    cleanError.code = error.code;
  }
  if (error.response?.data?.detail) {
    cleanError.details = redactSensitiveData(error.response.data.detail);
  }
  
  return cleanError;
}


// Instantiate Axios client targeting the Swasthya AI Core API service
const client = axios.create({
  baseURL: env.SWASTHYA_API_URL,
  timeout: 60000, // 60 seconds global timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for detailed diagnostic logging with privacy redaction
client.interceptors.request.use(
  (config) => {
    const absoluteUrl = config.baseURL 
      ? (config.baseURL.endsWith('/') ? config.baseURL.slice(0, -1) : config.baseURL) + config.url 
      : config.url;
      
    logger.info('📤 [Swasthya API Request]');
    logger.debug(`🔗 URL: [${config.method.toUpperCase()}] ${absoluteUrl}`);
    logger.debug(`📋 Headers: ${JSON.stringify(config.headers)}`);
    if (config.data) {
      logger.debug(`📦 Payload: ${JSON.stringify(redactSensitiveData(config.data))}`);
    }
    return config;
  },
  (error) => {
    logger.error('❌ Swasthya API Request compilation error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for detailed diagnostic logging with privacy redaction
client.interceptors.response.use(
  (response) => {
    logger.info(`📥 Received response from Swasthya API: status ${response.status}`);
    if (response.data) {
      logger.debug(`📦 Response Body: ${JSON.stringify(redactSensitiveData(response.data))}`);
    }
    return response;
  },
  (error) => {
    logger.error('❌ [Swasthya API Response Error]');
    logger.error(`Message: ${error.message}`);
    logger.error(`Code: ${error.code}`);
    logger.error(`Response Status: ${error.response?.status}`);
    if (error.response?.data) {
      logger.error(`Response Data: ${JSON.stringify(redactSensitiveData(error.response.data))}`);
    }
    return Promise.reject(error);
  }
);

/**
 * Standard retry helper with exponential backoff for requests.
 */
async function requestWithRetry(requestFn, retries = 3, initialDelay = 1000) {
  let delay = initialDelay;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await requestFn();
    } catch (error) {
      const isTimeout = error.code === 'ECONNABORTED' || error.message.includes('timeout');
      const isNetworkError = !error.response;
      const isServerError = error.response && error.response.status >= 500;
      
      const shouldRetry = (isTimeout || isNetworkError || isServerError) && attempt < retries;
      
      if (shouldRetry) {
        logger.warn(`⚠️ Swasthya API Request failed (attempt ${attempt}/${retries}). Retrying in ${delay}ms... Error: ${error.message}`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2; // exponential backoff
      } else {
        throw error;
      }
    }
  }
}

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
 * Analyzes raw patient message to extract structured context.
 * Calls: POST /api/context/analyze
 * 
 * The Swasthya AI Core API is stateful — it maintains its own Redis state
 * per context_id. We only need to send message + context_id on each turn.
 * 
 * @param {string} message - Raw user query message (may be enriched with location).
 * @param {string|null} contextId - Optional context_id for multi-turn conversations.
 * @param {string|null} correlationId - Optional tracer/correlation ID.
 * @returns {Promise<Object>} Mapped response object with success and data.
 */
async function analyzeContext(message, contextId = null, correlationId = null) {
  const payload = {
    message,
  };

  // Only include context_id if we have one (continuation of existing conversation)
  if (contextId) {
    payload.context_id = contextId;
  }
  if (correlationId) {
    payload.correlation_id = correlationId;
  }

  logger.info(`📤 [analyzeContext] Sending — contextId=${contextId || 'NEW'}, messageLength=${message.length}`);

  const requestFn = () => client.post('/api/context/analyze', payload);

  try {
    const response = await requestWithRetry(requestFn);
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    const errorDetails = error.response?.data || error.message;
    logger.error(`❌ analyzeContext failed: ${JSON.stringify(redactSensitiveData(errorDetails))}`);
    throw sanitizeAxiosError(error);
  }
}

/**
 * Starts hospital discovery search task.
 * Calls: POST /api/discovery/search
 * 
 * @param {Object} contextData - PatientContext object.
 * @param {number} maxResults - Max number of recommendations to retrieve.
 * @returns {Promise<Object>} Task ID for polling progress.
 */
async function startDiscovery(contextData, maxResults = 4) {
  const requestFn = () => client.post('/api/discovery/search', {
    context: contextData,
    max_results: maxResults,
  });

  try {
    const response = await requestWithRetry(requestFn);
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    const errorDetails = error.response?.data || error.message;
    logger.warn(`⚠️ [startDiscovery] Swasthya Core API unavailable (${error.message}). Utilizing local discovery fallback...`);
    const fallbackTaskId = `task-local-${Date.now()}`;
    return {
      success: true,
      data: {
        task_id: fallbackTaskId,
        is_fallback: true,
      },
    };
  }
}

/**
 * Retrieves progress and status of a discovery search task.
 * Calls: GET /api/tasks/{taskId}/progress
 * 
 * @param {string} taskId - The discovery task UUID.
 * @returns {Promise<Object>} Current task stage, percent progress, and result if completed.
 */
async function getTaskProgress(taskId) {
  const requestFn = () => client.get(`/api/tasks/${taskId}/progress`);

  try {
    const response = await requestWithRetry(requestFn);
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    const errorDetails = error.response?.data || error.message;
    logger.error(`❌ getTaskProgress failed: ${JSON.stringify(redactSensitiveData(errorDetails))}`);
    throw sanitizeAxiosError(error);
  }
}

/**
 * Health check ping targeting the Swasthya AI Core service.
 * Calls: GET /health
 * 
 * @returns {Promise<Object>} Service liveness details.
 */
async function health() {
  // 1. Try to read from cache first
  try {
    if (redisClient && redisClient.isOpen) {
      const cached = await redisClient.get('health:swasthya');
      if (cached) {
        logger.debug('⚡ [Swasthya Health Cache] Cache hit for health:swasthya');
        return JSON.parse(cached);
      }
    }
  } catch (err) {
    logger.warn(`⚠️ [Swasthya Health Cache] Failed to read from cache: ${err.message}`);
  }

  const start = Date.now();
  const requestFn = () => client.get('/health', { timeout: 3000 });

  try {
    const response = await requestWithRetry(requestFn, 2, 500);
    const latencyMs = Date.now() - start;
    
    const healthResult = {
      success: true,
      data: response.data,
      latencyMs,
    };

    // 2. Cache response in Redis with 30s TTL
    try {
      if (redisClient && redisClient.isOpen) {
        await redisClient.set('health:swasthya', JSON.stringify(healthResult), { EX: 30 });
        logger.debug('⚡ [Swasthya Health Cache] Cached health:swasthya with 30s TTL');
      }
    } catch (err) {
      logger.warn(`⚠️ [Swasthya Health Cache] Failed to write to cache: ${err.message}`);
    }

    return healthResult;
  } catch (error) {
    logger.error(`❌ health check failed: ${error.message}`);
    throw sanitizeAxiosError(error);
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
        swasthyaUptimeSeconds: 0,
      };
    }

    const [aiSum, aiCount, workflowSum, workflowCount, failures, retries, uptimeStart] = await Promise.all([
      redisClient.get('metrics:ai_latency_sum'),
      redisClient.get('metrics:ai_latency_count'),
      redisClient.get('metrics:workflow_duration_sum'),
      redisClient.get('metrics:workflow_duration_count'),
      redisClient.get('metrics:failure_count'),
      redisClient.get('metrics:retry_count'),
      redisClient.get('metrics:swasthya_uptime_start'),
    ]);

    const aiLatencySum = parseInt(aiSum || '0', 10);
    const aiLatencyCount = parseInt(aiCount || '0', 10);
    const workflowDurationSum = parseInt(workflowSum || '0', 10);
    const workflowDurationCount = parseInt(workflowCount || '0', 10);

    let swasthyaUptimeSeconds = 0;
    if (uptimeStart) {
      swasthyaUptimeSeconds = Math.round((Date.now() - parseInt(uptimeStart, 10)) / 1000);
    }

    return {
      averageAiLatencyMs: aiLatencyCount > 0 ? Math.round(aiLatencySum / aiLatencyCount) : 0,
      averageWorkflowDurationMs: workflowDurationCount > 0 ? Math.round(workflowDurationSum / workflowDurationCount) : 0,
      failureCount: parseInt(failures || '0', 10),
      retryCount: parseInt(retries || '0', 10),
      swasthyaUptimeSeconds,
    };
  } catch (error) {
    logger.error('Error fetching metrics:', error.message);
    return {
      averageAiLatencyMs: 0,
      averageWorkflowDurationMs: 0,
      failureCount: 0,
      retryCount: 0,
      swasthyaUptimeSeconds: 0,
    };
  }
}

module.exports = {
  analyzeContext,
  startDiscovery,
  getTaskProgress,
  health,
  getSystemMetrics,
  recordValueMetric,
  incrementMetric,
  sanitizeAxiosError,
  redactSensitiveData,
};
