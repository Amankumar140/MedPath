const { PassThrough } = require('stream');
const conversationRepository = require('./conversation.repository');
const swasthyaService = require('../../services/swasthya.service');
const llmService = require('../../services/llm.service');
const cacheService = require('../../services/cache.service');
const discoveryPollingService = require('../../services/discovery.polling');
const logger = require('../../config/logger');

/**
 * Sanitizes the patient context object by removing the sensitive 'clinical' model
 * to ensure that structured patient signals are never persisted to PostgreSQL or Redis.
 * @param {Object} contextData - PatientContext object.
 * @returns {Object|null} Sanitized PatientContext object.
 */
function sanitizePatientContextForStorage(contextData) {
  if (!contextData) return null;
  try {
    const copy = JSON.parse(JSON.stringify(contextData));
    if (copy.clinical) {
      delete copy.clinical;
    }
    return copy;
  } catch (e) {
    logger.error('Failed to sanitize patient context for storage:', e.message);
    return null;
  }
}


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
  const cacheData = {
    ...conversation,
    context_id: null,
    session_version: null,
    last_message: null,
    context_completion_state: false,
  };
  await cacheService.set(`conversation:${conversation.id}`, cacheData, 1800); // 30m TTL
  
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
    conversationMeta = {
      ...meta,
      context_id: dbContext?.contextId || null,
      session_version: dbContext?.sessionVersion || null,
      last_message: dbMessages[dbMessages.length - 1]?.message || null,
      context_completion_state: dbContext?.isContextComplete || false,
    };
    await cacheService.set(`conversation:${id}`, conversationMeta, 1800); // 30m TTL
  }

  return {
    conversation: conversationMeta,
    messages,
    patientContext,
    recommendationSnapshots,
  };
}

/**
 * Handles sending a user message, invoking the AI Gateway, storing the response, and updating context.
 * Returns a PassThrough stream that emulates the streaming interface.
 * @param {string} id - Conversation UUID.
 * @param {string} userId - User UUID.
 * @param {string} messageText - The user message text.
 * @returns {Promise<stream.Readable>} Response stream.
 */
async function sendMessage(id, userId, messageText, locationData = {}) {
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

  // Update PatientContext with locationData if supplied
  if (locationData && (locationData.latitude || locationData.city || locationData.formattedAddress)) {
    const currentContext = fullConversation.patientContext || {};
    const updatedContext = {
      ...currentContext,
      latitude: locationData.latitude !== undefined ? locationData.latitude : currentContext.latitude,
      longitude: locationData.longitude !== undefined ? locationData.longitude : currentContext.longitude,
      formattedAddress: locationData.formattedAddress !== undefined ? locationData.formattedAddress : currentContext.formattedAddress,
      city: locationData.city !== undefined ? locationData.city : currentContext.city,
      location: (locationData.city || locationData.formattedAddress) || currentContext.location,
    };
    await conversationRepository.updatePatientContext(id, updatedContext);
    
    // Update local variable reference for further use in this function
    fullConversation.patientContext = {
      ...fullConversation.patientContext,
      ...updatedContext,
    };
  }

  const startTime = Date.now();

  // 2. Save USER message immediately (raw user text, unmodified)
  const userMessage = await conversationRepository.createMessage(id, 'USER', messageText, 'TEXT');
  logger.info(`📩 Message received: ConversationID=${id}, MessageID=${userMessage.id}`);

  // Retrieve current context_id from the conversation database record
  const currentContextId = fullConversation.contextId || fullConversation.patientContext?.contextId || null;

  // 2.5 Enrich the message with geographic location for the Swasthya API.
  let enrichedMessage = messageText;
  const patientCtx = fullConversation.patientContext || {};
  const locationString = patientCtx.city || patientCtx.formattedAddress || locationData?.city || locationData?.formattedAddress || null;

  if (locationString) {
    const lowerMsg = messageText.toLowerCase();
    const lowerLoc = locationString.toLowerCase();
    if (!lowerMsg.includes(lowerLoc) && !['located in', 'live in', 'my location is', 'i am in', 'i am at', 'near'].some(phrase => lowerMsg.includes(phrase))) {
      enrichedMessage = `${messageText}. My location is ${locationString}`;
      logger.info(`📍 [sendMessage] Attached location to message: "${locationString}"`);
    }
  }

  // 3. Delegate conversation intelligence to Python LLM Microservice
  logger.info(`🔎 [sendMessage] Delegation to Python LLM Service | ConversationID=${id}`);
  let llmResult;
  try {
    llmResult = await llmService.postContext({
      conversationId: id,
      message: messageText,
      browserLocation: locationData,
    });
  } catch (error) {
    logger.error(`❌ [sendMessage] Python LLM Service call failed: ${error.message}`);
    await swasthyaService.incrementMetric('metrics:failure_count');
    throw error;
  }

  const latency = Date.now() - startTime;
  await swasthyaService.recordValueMetric('metrics:ai_latency_sum', 'metrics:ai_latency_count', latency);

  const isComplete = llmResult.status === 'COMPLETE';
  const outputStream = new PassThrough();

  (async () => {
    try {
      outputStream.write(JSON.stringify({ type: 'status', message: '🔍 Analyzing query and parsing clinical signals...' }) + '\n');

      if (!isComplete) {
        // 4. Handle FOLLOW_UP status returned from Python LLM microservice
        const followupQuestion = llmResult.question || 'Could you please provide more details regarding your symptoms?';
        
        await conversationRepository.createMessage(id, 'AI', followupQuestion, 'FOLLOW_UP');

        // Extract newly identified clinical signals from Python LLM response
        const extCtx = llmResult.extracted_context || {};
        const existingCtx = fullConversation.patientContext || {};

        const symptomsVal = extCtx.symptoms && extCtx.symptoms.length > 0 
          ? (Array.isArray(extCtx.symptoms) ? extCtx.symptoms.join(', ') : extCtx.symptoms)
          : (Array.isArray(existingCtx.symptoms) ? existingCtx.symptoms.join(', ') : (existingCtx.symptoms || null));

        const loc = extCtx.browser_location || locationData || {};

        const mappedContext = {
          symptoms: symptomsVal,
          age: extCtx.age || existingCtx.age || null,
          durationDays: extCtx.duration ? (parseInt(String(extCtx.duration).match(/\d+/)?.[0] || '1', 10)) : (existingCtx.durationDays || null),
          location: loc.formattedAddress || loc.city || existingCtx.location || locationData?.formattedAddress || locationData?.city || null,
          latitude: loc.latitude !== undefined ? loc.latitude : (existingCtx.latitude || locationData?.latitude || null),
          longitude: loc.longitude !== undefined ? loc.longitude : (existingCtx.longitude || locationData?.longitude || null),
          formattedAddress: loc.formattedAddress || existingCtx.formattedAddress || locationData?.formattedAddress || null,
          city: loc.city || existingCtx.city || locationData?.city || null,
          careIntent: extCtx.care_intent || existingCtx.careIntent || null,
          budget: extCtx.budget || existingCtx.budget || null,
          detectedLanguage: extCtx.language || existingCtx.detectedLanguage || 'en',
          isContextComplete: false,
        };
        await conversationRepository.updatePatientContext(id, mappedContext);

        const updatedConversation = await conversationRepository.updateConversation(id, {
          updatedAt: new Date(),
        });

        const cacheData = {
          ...updatedConversation,
          last_message: messageText || null,
          context_completion_state: false,
        };
        await cacheService.set(`conversation:${id}`, cacheData, 1800);

        const finalChunk = {
          type: 'final',
          is_complete: false,
          message: followupQuestion,
          context: {
            is_context_complete: false,
            missing_fields: llmResult.missing_fields || [],
            symptoms: symptomsVal,
          },
        };
        outputStream.write(JSON.stringify(finalChunk) + '\n');
        outputStream.end();
      } else {
        // 5. Handle COMPLETE status returned from Python LLM microservice
        // Node calls Swasthya AI Core API only when complete context is available!
        const structuredContext = llmResult.context || {};
        logger.info(`✅ [sendMessage] Context COMPLETE. Passing structured context to Swasthya API for ConversationID=${id}`);

        let result;
        try {
          // Format complete message context for Swasthya AI Core API
          const fullMessageText = `${messageText}. Symptoms: ${JSON.stringify(structuredContext.symptoms || [])}. Age: ${structuredContext.age || 'unspecified'}. Location: ${JSON.stringify(structuredContext.browser_location || {})}`;
          result = await swasthyaService.analyzeContext(fullMessageText, fullConversation.contextId || null);
        } catch (error) {
          logger.warn(`⚠️ Swasthya API analyzeContext fallback: ${error.message}`);
          result = { data: { context_id: fullConversation.contextId, session_version: 1 } };
        }

        const info = result.data || {};
        const aiMessageText = 'Context complete. Starting regional healthcare search...';
        await conversationRepository.createMessage(id, 'AI', aiMessageText, 'STATUS');

        const symptomsStr = Array.isArray(structuredContext.symptoms) ? structuredContext.symptoms.join(', ') : (structuredContext.symptoms || null);
        const loc = structuredContext.browser_location || locationData || {};
        const cityStr = loc.city || fullConversation.patientContext?.city || null;
        const latVal = loc.latitude !== undefined ? loc.latitude : (fullConversation.patientContext?.latitude || null);
        const lngVal = loc.longitude !== undefined ? loc.longitude : (fullConversation.patientContext?.longitude || null);

        // Build valid context_data for Swasthya API discovery call
        let contextDataForDiscovery = info.context_data;
        if (!contextDataForDiscovery || !contextDataForDiscovery.clinical) {
          const symptomsArr = Array.isArray(structuredContext.symptoms) 
            ? structuredContext.symptoms 
            : (typeof structuredContext.symptoms === 'string' ? structuredContext.symptoms.split(',').map(s => s.trim()) : []);

          let durationDays = null;
          if (structuredContext.duration) {
            const match = String(structuredContext.duration).match(/\d+/);
            if (match) durationDays = parseInt(match[0], 10);
          }

          contextDataForDiscovery = {
            context_id: info.context_id || `ctx-${Date.now()}`,
            session_version: info.session_version || 1,
            is_context_complete: true,
            missing_fields: [],
            clinical: {
              symptoms: symptomsArr,
              age_years: typeof structuredContext.age === 'number' ? structuredContext.age : (parseInt(structuredContext.age, 10) || null),
              symptom_duration_days: durationDays,
              severity: structuredContext.severity || null,
              care_intent: structuredContext.care_intent || 'General Triage',
              budget: { preference: structuredContext.budget || 'Standard' },
              patient_location: {
                raw_location: loc.formattedAddress || loc.city || fullConversation.patientContext?.formattedAddress || fullConversation.patientContext?.location || 'Unknown',
                city: cityStr || 'Unknown',
                latitude: latVal,
                longitude: lngVal,
              }
            }
          };
        }

        const mappedContext = {
          symptoms: symptomsStr,
          age: typeof structuredContext.age === 'number' ? structuredContext.age : (parseInt(structuredContext.age, 10) || null),
          durationDays: structuredContext.duration ? (parseInt(String(structuredContext.duration).match(/\d+/)?.[0] || '1', 10)) : null,
          location: loc.formattedAddress || loc.city || null,
          latitude: latVal,
          longitude: lngVal,
          formattedAddress: loc.formattedAddress || null,
          city: cityStr,
          careIntent: structuredContext.care_intent || null,
          budget: structuredContext.budget || null,
          detectedLanguage: structuredContext.language || 'en',
          isContextComplete: true,
          contextId: info.context_id || null,
          sessionVersion: info.session_version || null,
          contextData: sanitizePatientContextForStorage(contextDataForDiscovery) || null,
          taskId: null,
        };
        await conversationRepository.updatePatientContext(id, mappedContext);

        await conversationRepository.updateConversation(id, {
          updatedAt: new Date(),
          detectedLanguage: info.language_code || null,
          contextId: info.context_id || null,
          sessionVersion: info.session_version || null,
          contextData: sanitizePatientContextForStorage(contextDataForDiscovery) || null,
        });

        // 5.1 Check if we have a recently completed discovery match (within last 4 hours)
        const match = await conversationRepository.findCompletedContextMatch(
          symptomsStr,
          cityStr,
          latVal,
          lngVal,
          4 // 4-hour window
        );

        if (match) {
          logger.info(`⚡ [sendMessage] Cache HIT for symptoms="${symptomsStr}"/location="${cityStr}". Reusing completed discovery from conversation ${match.conversationId}`);
          
          const matchFinalMsg = match.conversation?.messages?.[0]?.message || 
            `Based on your location in ${cityStr || 'your location'} and health criteria regarding '${symptomsStr || 'your symptoms'}', I have processed local medical registries. Here are your optimized options:`;

          await conversationRepository.reuseCompletedDiscovery(match.conversationId, id, matchFinalMsg);

          outputStream.write(JSON.stringify({ type: 'status', message: '⚡ Retreiving instant matching recommendations from local registry cache...' }) + '\n');
          await cacheService.del(`conversation:${id}`);

          const clinicalMatch = match.contextData?.clinical || {};
          const finalChunk = {
            type: 'final',
            is_complete: true,
            message: matchFinalMsg,
            context: {
              symptoms: symptomsStr,
              age: clinicalMatch.age_years || null,
              duration_days: clinicalMatch.symptom_duration_days || null,
              location: clinicalMatch.patient_location?.raw_location || null,
              latitude: latVal,
              longitude: lngVal,
              formatted_address: clinicalMatch.patient_location?.raw_location || null,
              city: cityStr,
              care_intent: clinicalMatch.care_intent || null,
              budget: clinicalMatch.budget?.preference || null,
              detected_language: info.language_code || 'en',
              is_context_complete: true,
            },
          };
          outputStream.write(JSON.stringify(finalChunk) + '\n');
          outputStream.end();
        } else {
          // 5.2 No match found -> Trigger standard Discovery process
          logger.info(`🔍 [sendMessage] Cache MISS. Initiating live Swasthya discovery task...`);

          outputStream.write(JSON.stringify({ type: 'status', message: '✅ Context complete. Starting regional healthcare search...' }) + '\n');

          const discoveryRes = await swasthyaService.startDiscovery(contextDataForDiscovery);
          const taskId = discoveryRes.data?.task_id || discoveryRes.task_id || `task-${Date.now()}`;

          // Store task_id in Conversation and PatientContext
          const updatedContext = {
            ...mappedContext,
            contextData: sanitizePatientContextForStorage(contextDataForDiscovery) || null,
            taskId,
          };
          await conversationRepository.updatePatientContext(id, updatedContext);

          const updatedConversation = await conversationRepository.updateConversation(id, {
            updatedAt: new Date(),
            contextData: sanitizePatientContextForStorage(contextDataForDiscovery) || null,
            taskId,
          });

          // Cache Conversation in Redis with 30-minute TTL
          const cacheData = {
            ...updatedConversation,
            context_id: info.context_id || null,
            session_version: info.session_version || null,
            last_message: messageText || null,
            context_completion_state: true,
          };
          await cacheService.set(`conversation:${id}`, cacheData, 1800);

          // Start background polling for discovery progress
          discoveryPollingService.startPolling(id, taskId);

          // Write final chunk to stream indicating discovery has started
          const clinical = contextDataForDiscovery?.clinical || {};
          const finalChunk = {
            type: 'final',
            is_complete: true,
            message: aiMessageText,
            data: {
              task_id: taskId,
            },
            context: {
              symptoms: symptomsStr,
              age: clinical.age_years || null,
              duration_days: clinical.symptom_duration_days || null,
              location: clinical.patient_location?.raw_location || null,
              latitude: latVal,
              longitude: lngVal,
              formatted_address: clinical.patient_location?.raw_location || null,
              city: cityStr,
              care_intent: clinical.care_intent || null,
              budget: clinical.budget?.preference || null,
              detected_language: info.language_code || 'en',
              is_context_complete: true,
            },
          };
          outputStream.write(JSON.stringify(finalChunk) + '\n');
          outputStream.end();
        }
      }

      // Record total workflow duration
      const duration = Date.now() - startTime;
      await swasthyaService.recordValueMetric('metrics:workflow_duration_sum', 'metrics:workflow_duration_count', duration);
    } catch (err) {
      logger.error('❌ Error executing sendMessage workflow:', err);
      await swasthyaService.incrementMetric('metrics:failure_count');
      outputStream.write(JSON.stringify({ type: 'error', message: `Execution Error: ${err.message}` }) + '\n');
      outputStream.end();
    }
  })();

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

/**
 * Retrieves the discovery search progress for a conversation.
 * First reads from Redis key task:{taskId}, then falls back to PostgreSQL conversation status.
 * @param {string} id - Conversation UUID.
 * @param {string} userId - Requesting user UUID.
 * @returns {Promise<Object>} The progress information.
 */
async function getDiscoveryProgress(id, userId) {
  const conversation = await conversationRepository.findConversationById(id);
  if (!conversation) {
    const error = new Error('Conversation not found');
    error.statusCode = 404;
    throw error;
  }
  
  if (conversation.userId !== userId) {
    const error = new Error('Forbidden: You do not have access to this conversation');
    error.statusCode = 403;
    throw error;
  }

  const taskId = conversation.taskId;
  if (!taskId) {
    return { status: 'not_started' };
  }

  // 1. Read from Redis key task:{taskId}
  const { redisClient } = require('../../config/redis');
  if (redisClient && redisClient.isOpen) {
    try {
      const cached = await redisClient.get(`task:${taskId}`);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (err) {
      logger.warn(`⚠️ Failed to read task progress from Redis: ${err.message}`);
    }
  }

  // 2. If not in Redis, check conversation status in DB
  if (conversation.status === 'COMPLETED') {
    return {
      status: 'completed',
      progress: 100,
      current_stage: 'Completed',
      percentage: 100,
    };
  }

  return {
    status: 'running',
    progress: 0,
    current_stage: 'Queued',
    percentage: 0,
  };
}

module.exports = {
  createConversation,
  listUserConversations,
  getConversationDetails,
  sendMessage,
  softDeleteConversation,
  getDiscoveryProgress,
  sanitizePatientContextForStorage,
};
