const axios = require('axios');
const env = require('../config/env');
const logger = require('../config/logger');

// Instantiate Axios client targeting the LLM Microservice
const client = axios.create({
  baseURL: env.LLM_SERVICE_URL,
  timeout: 120000, // 120 seconds — LLM makes 3 sequential Mistral calls (extraction+validation+followup)
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Calls the Python LLM microservice POST /context endpoint to process conversation context,
 * extract structured signals, manage memory state, and obtain completion/follow-up response.
 *
 * @param {Object} params
 * @param {string} params.conversationId - Conversation UUID
 * @param {string} params.message - Raw user message text
 * @param {Object} [params.browserLocation] - Optional browser location (city, latitude, longitude)
 * @returns {Promise<Object>} Either { status: "FOLLOW_UP", question: "...", missing_fields: [...] } or { status: "COMPLETE", context: { ... } }
 */
async function postContext({ conversationId, message, browserLocation }) {
  const payload = {
    conversation_id: conversationId,
    message: message,
  };

  if (browserLocation) {
    payload.browser_location = {
      city: browserLocation.city || null,
      latitude: browserLocation.latitude !== undefined ? browserLocation.latitude : null,
      longitude: browserLocation.longitude !== undefined ? browserLocation.longitude : null,
      formattedAddress: browserLocation.formattedAddress || null,
    };
  }

  logger.info(`📤 [LLM Microservice Request] POST /context | ConversationID=${conversationId}`);

  try {
    const response = await client.post('/context', payload);
    logger.info(`📥 [LLM Microservice Response] status=${response.data.status} | ConversationID=${conversationId}`);
    return response.data;
  } catch (error) {
    const statusCode = error.response?.status || 500;
    const errorMsg = error.response?.data?.detail || error.message || 'LLM Microservice Request Failed';
    logger.error(`❌ [LLM Microservice Error] status=${statusCode} | message=${errorMsg}`);

    const err = new Error(errorMsg);
    err.statusCode = statusCode;
    throw err;
  }
}

module.exports = {
  postContext,
};
