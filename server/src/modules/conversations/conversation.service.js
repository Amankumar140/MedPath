const { PassThrough } = require('stream');
const conversationRepository = require('./conversation.repository');
const pythonService = require('../../services/python.service');
const cacheService = require('../../services/cache.service');
const logger = require('../../config/logger');

/**
 * Creates a new conversation and caches its metadata.
 * @param {string} userId - User UUID.
 * @param {string} [title] - Optional conversation title.
 * @returns {Promise<Object>} The created conversation.
 */
async function createConversation(userId, title) {
  const conversation = await conversationRepository.createConversation(userId, title);
  
  logger.info(`💬 Conversation created: ID=${conversation.id}, UserID=${userId}`);
  
  // Cache the metadata (Conversation fields only, no relations)
  await cacheService.set(`conversation:${conversation.id}`, conversation, 3600); // 1h TTL
  
  return conversation;
}

/**
 * Lists active conversations for a user.
 * @param {string} userId - User UUID.
 * @returns {Promise<Array>} List of conversations.
 */
async function listUserConversations(userId) {
  return await conversationRepository.findConversationsByUserId(userId);
}

/**
 * Gets conversation details (including messages and patient context).
 * Uses Redis cache for conversation metadata.
 * @param {string} id - Conversation UUID.
 * @param {string} userId - Requesting user UUID.
 * @returns {Promise<Object>} Conversation details.
 */
async function getConversationDetails(id, userId) {
  let conversationMeta = await cacheService.get(`conversation:${id}`);
  let messages = [];
  let patientContext = null;
  let recommendationSnapshots = [];

  if (conversationMeta) {
    if (conversationMeta.userId !== userId) {
      const error = new Error('Forbidden: You do not have access to this conversation');
      error.statusCode = 403;
      throw error;
    }
    
    // Fetch messages and context from DB since they are not cached
    const fullConversation = await conversationRepository.findConversationById(id);
    if (!fullConversation) {
      const error = new Error('Conversation not found');
      error.statusCode = 404;
      throw error;
    }
    messages = fullConversation.messages;
    patientContext = fullConversation.patientContext;
    recommendationSnapshots = fullConversation.recommendationSnapshots || [];
  } else {
    // Cache miss - retrieve all from database
    const fullConversation = await conversationRepository.findConversationById(id);
    if (!fullConversation) {
      const error = new Error('Conversation not found');
      error.statusCode = 404;
      throw error;
    }
    
    if (fullConversation.userId !== userId) {
      const error = new Error('Forbidden: You do not have access to this conversation');
      error.statusCode = 403;
      throw error;
    }

    const { messages: dbMessages, patientContext: dbContext, recommendationSnapshots: dbSnapshots, ...meta } = fullConversation;
    conversationMeta = meta;
    messages = dbMessages;
    patientContext = dbContext;
    recommendationSnapshots = dbSnapshots || [];

    // Save metadata back to cache
    await cacheService.set(`conversation:${id}`, conversationMeta, 3600);
  }

  return {
    conversation: conversationMeta,
    messages,
    patientContext,
    recommendationSnapshots,
  };
}

/**
 * Handles sending a user message, invoking the AI Gateway stream, storing the response, and updating context.
 * Returns a PassThrough stream that intercepts the final chunk for persistence.
 * @param {string} id - Conversation UUID.
 * @param {string} userId - User UUID.
 * @param {string} messageText - The user message text.
 * @returns {Promise<stream.Readable>} Intercepted response stream.
 */
async function sendMessage(id, userId, messageText) {
  // 1. Verify ownership of the conversation
  const fullConversation = await conversationRepository.findConversationById(id);
  if (!fullConversation) {
    const error = new Error('Conversation not found');
    error.statusCode = 404;
    throw error;
  }
  
  if (fullConversation.userId !== userId) {
    const error = new Error('Forbidden: You do not have access to this conversation');
    error.statusCode = 403;
    throw error;
  }

  // 2. Save user message
  const userMessage = await conversationRepository.createMessage(id, 'USER', messageText, 'TEXT');
  logger.info(`📩 Message received: ConversationID=${id}, MessageID=${userMessage.id}`);

  // 3. Forward details to Python service stream via AI gateway
  logger.debug(`Initiating Python AI stream for ConversationID=${id}`);
  const { responseStream, startTime, retryCount } = await pythonService.sendMessageStream(id, messageText);

  // 4. Create custom pass-through to pipe output and capture final data
  const outputStream = new PassThrough();
  let accumulatedData = '';

  responseStream.on('data', (chunk) => {
    accumulatedData += chunk.toString();
    outputStream.write(chunk);
  });

  responseStream.on('end', async () => {
    try {
      const end = Date.now();
      const latency = end - startTime;
      
      // Record latency metrics
      await pythonService.recordValueMetric('metrics:ai_latency_sum', 'metrics:ai_latency_count', latency);
      await pythonService.recordValueMetric('metrics:workflow_duration_sum', 'metrics:workflow_duration_count', latency);

      // Parse the line-separated JSON chunks
      const lines = accumulatedData.split('\n').filter(l => l.trim() !== '');
      let finalChunk = null;

      for (const line of lines) {
        try {
          const parsed = JSON.parse(line);
          if (parsed.type === 'final') {
            finalChunk = parsed;
          }
        } catch (e) {
          // Skip invalid JSON lines (e.g. status text or buffer cuts)
        }
      }

      if (finalChunk) {
        const aiMessageText = finalChunk.message;
        const isComplete = finalChunk.is_complete;
        const msgType = isComplete ? 'FINAL' : 'FOLLOW_UP';

        // 1. Save AI Response Message
        await conversationRepository.createMessage(id, 'AI', aiMessageText, msgType);

        // 2. Save PatientContext (using only structured data returned by Python)
        if (finalChunk.context) {
          const pythonContext = finalChunk.context;
          const mappedContext = {
            symptoms: pythonContext.symptoms,
            age: pythonContext.age,
            durationDays: pythonContext.duration_days,
            location: pythonContext.location,
            latitude: pythonContext.latitude || null,
            longitude: pythonContext.longitude || null,
            formattedAddress: pythonContext.formatted_address || null,
            city: pythonContext.city || null,
            careIntent: pythonContext.care_intent,
            budget: pythonContext.budget,
            detectedLanguage: pythonContext.detected_language,
            isContextComplete: pythonContext.is_context_complete,
          };
          await conversationRepository.updatePatientContext(id, mappedContext);
        }

        // 3. Save Recommendation Snapshots if complete (does not overwrite previous snapshots)
        if (isComplete && finalChunk.data && finalChunk.data.recommended_hospitals) {
          const hospitals = finalChunk.data.recommended_hospitals;
          for (const hosp of hospitals) {
            await conversationRepository.createRecommendationSnapshot(id, {
              hospitalName: hosp.hospital_name,
              rankingPosition: hosp.ranking_position,
              confidenceScore: hosp.confidence_score,
              trustScore: hosp.trust_score,
              estimatedCost: hosp.estimated_cost,
              distance: hosp.distance,
              latitude: hosp.latitude,
              longitude: hosp.longitude,
              reason: hosp.explanation,
              source: hosp.suitability || 'FastAPI Agent Pipeline',
            });
          }
        }

        // 4. Update Conversation meta (updatedAt, detectedLanguage)
        const updateMeta = { updatedAt: new Date() };
        if (finalChunk.context && finalChunk.context.detected_language) {
          updateMeta.detectedLanguage = finalChunk.context.detected_language;
        }
        
        const updatedConversation = await conversationRepository.updateConversation(id, updateMeta);

        // Update Cache
        await cacheService.set(`conversation:${id}`, updatedConversation, 3600);
      }

      outputStream.end();
    } catch (persistError) {
      logger.error('❌ Error persisting AI response from stream:', persistError.message);
      await pythonService.incrementMetric('metrics:failure_count');
      outputStream.destroy(persistError);
    }
  });

  responseStream.on('error', async (streamError) => {
    logger.error('❌ Python stream transmission error:', streamError.message);
    await pythonService.incrementMetric('metrics:failure_count');
    outputStream.destroy(streamError);
  });

  return outputStream;
}

/**
 * Soft deletes a conversation and invalidates its Redis cache.
 * @param {string} id - Conversation UUID.
 * @param {string} userId - Requesting user UUID.
 * @returns {Promise<Object>} Soft-deleted conversation record.
 */
async function softDeleteConversation(id, userId) {
  const fullConversation = await conversationRepository.findConversationById(id);
  if (!fullConversation) {
    const error = new Error('Conversation not found');
    error.statusCode = 404;
    throw error;
  }
  
  if (fullConversation.userId !== userId) {
    const error = new Error('Forbidden: You do not have access to this conversation');
    error.statusCode = 403;
    throw error;
  }

  const deletedConversation = await conversationRepository.softDeleteConversation(id);
  
  logger.info(`🗑️ Conversation soft-deleted: ID=${id}`);

  // Invalidate Redis cache
  await cacheService.del(`conversation:${id}`);

  return deletedConversation;
}

module.exports = {
  createConversation,
  listUserConversations,
  getConversationDetails,
  sendMessage,
  softDeleteConversation,
};
