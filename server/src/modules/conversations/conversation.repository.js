const { prisma, handlePrismaError } = require('../../config/database');

/**
 * Creates a new conversation and its associated empty PatientContext in a transaction.
 * @param {string} userId - The owner user UUID.
 * @param {string} [title] - Optional conversation title.
 * @returns {Promise<Object>} The created conversation object.
 */
async function createConversation(userId, locationData = {}) {
  try {
    const title = locationData.title || 'New Conversation';
    const latitude = locationData.latitude;
    const longitude = locationData.longitude;
    const formattedAddress = locationData.formattedAddress;
    const city = locationData.city;

    return await prisma.$transaction(async (tx) => {
      const conversation = await tx.conversation.create({
        data: {
          userId,
          title,
          status: 'ACTIVE',
        },
      });

      await tx.patientContext.create({
        data: {
          conversationId: conversation.id,
          isContextComplete: false,
          latitude: latitude || null,
          longitude: longitude || null,
          formattedAddress: formattedAddress || null,
          city: city || null,
          location: city || formattedAddress || null,
        },
      });

      return conversation;
    });
  } catch (error) {
    throw handlePrismaError(error);
  }
}

/**
 * Finds a conversation by ID, including its messages and patient context.
 * Excludes conversations that are soft-deleted.
 * @param {string} id - Conversation UUID.
 * @returns {Promise<Object|null>} The conversation with relations, or null.
 */
async function findConversationById(id) {
  try {
    return await prisma.conversation.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        messages: {
          orderBy: {
            createdAt: 'asc',
          },
        },
        patientContext: true,
        recommendationSnapshots: true,
      },
    });
  } catch (error) {
    throw handlePrismaError(error);
  }
}

/**
 * Finds all active (non-soft-deleted) conversations belonging to a user.
 * Sorted by updatedAt descending.
 * @param {string} userId - User UUID.
 * @returns {Promise<Array>} List of user conversations.
 */
async function findConversationsByUserId(userId) {
  try {
    return await prisma.conversation.findMany({
      where: {
        userId,
        deletedAt: null,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
  } catch (error) {
    throw handlePrismaError(error);
  }
}

/**
 * Appends a new message to a conversation.
 * @param {string} conversationId - Conversation UUID.
 * @param {string} sender - Sender role ('USER', 'AI', 'SYSTEM').
 * @param {string} message - Content of the message.
 * @param {string} messageType - Type of the message ('TEXT', 'STATUS', 'FOLLOW_UP', 'FINAL').
 * @returns {Promise<Object>} The created message.
 */
async function createMessage(conversationId, sender, message, messageType) {
  try {
    return await prisma.conversationMessage.create({
      data: {
        conversationId,
        sender,
        message,
        messageType,
      },
    });
  } catch (error) {
    throw handlePrismaError(error);
  }
}

/**
 * Updates the PatientContext fields associated with a conversation.
 * @param {string} conversationId - Conversation UUID.
 * @param {Object} contextData - PatientContext fields to update.
 * @returns {Promise<Object>} The updated PatientContext.
 */
async function updatePatientContext(conversationId, contextData) {
  try {
    return await prisma.patientContext.update({
      where: { conversationId },
      data: {
        symptoms: contextData.symptoms,
        age: contextData.age,
        durationDays: contextData.durationDays,
        location: contextData.location,
        latitude: contextData.latitude,
        longitude: contextData.longitude,
        formattedAddress: contextData.formattedAddress,
        city: contextData.city,
        careIntent: contextData.careIntent,
        budget: contextData.budget,
        detectedLanguage: contextData.detectedLanguage,
        isContextComplete: contextData.isContextComplete,
        contextId: contextData.contextId,
        sessionVersion: contextData.sessionVersion,
        contextData: contextData.contextData,
        taskId: contextData.taskId,
      },
    });
  } catch (error) {
    throw handlePrismaError(error);
  }
}

/**
 * Soft deletes a conversation by setting deletedAt to the current timestamp.
 * @param {string} id - Conversation UUID.
 * @returns {Promise<Object>} The soft-deleted conversation record.
 */
async function softDeleteConversation(id) {
  try {
    return await prisma.conversation.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });
  } catch (error) {
    throw handlePrismaError(error);
  }
}

/**
 * Updates metadata of a conversation (e.g. status, detectedLanguage, title).
 * @param {string} id - Conversation UUID.
 * @param {Object} updateData - Conversation fields to update.
 * @returns {Promise<Object>} The updated conversation.
 */
async function updateConversation(id, updateData) {
  try {
    return await prisma.conversation.update({
      where: { id },
      data: updateData,
    });
  } catch (error) {
    throw handlePrismaError(error);
  }
}

async function createRecommendationSnapshot(conversationId, snapshot) {
  try {
    return await prisma.recommendationSnapshot.create({
      data: {
        conversationId,
        hospitalName: snapshot.hospitalName,
        rankingPosition: snapshot.rankingPosition,
        confidenceScore: snapshot.confidenceScore,
        trustScore: snapshot.trustScore,
        estimatedCost: snapshot.estimatedCost,
        distance: snapshot.distance,
        latitude: snapshot.latitude,
        longitude: snapshot.longitude,
        reason: snapshot.reason,
        source: snapshot.source,
      },
    });
  } catch (error) {
    throw handlePrismaError(error);
  }
}

async function findRecommendationSnapshotsByConversationId(conversationId) {
  try {
    return await prisma.recommendationSnapshot.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
    });
  } catch (error) {
    throw handlePrismaError(error);
  }
}

/**
 * Finds a completed context match within a specific time window.
 * @param {string} symptoms - Symptoms string.
 * @param {string} city - City name.
 * @param {number} latitude - Latitude coordinate.
 * @param {number} longitude - Longitude coordinate.
 * @param {number} timeWindowHours - Hours to look back.
 * @returns {Promise<Object|null>} The matching patient context or null.
 */
async function findCompletedContextMatch(symptoms, city, latitude, longitude, timeWindowHours = 4) {
  try {
    const timeLimit = new Date(Date.now() - timeWindowHours * 60 * 60 * 1000);
    const candidates = await prisma.patientContext.findMany({
      where: {
        isContextComplete: true,
        updatedAt: {
          gte: timeLimit,
        },
        conversation: {
          status: 'COMPLETED',
        },
      },
      include: {
        conversation: {
          include: {
            messages: {
              where: {
                messageType: 'FINAL',
              },
              orderBy: {
                createdAt: 'desc',
              },
              take: 1,
            },
          },
        },
      },
    });

    const normalizeSymptoms = (s) => (s || '').toLowerCase().split(',').map(x => x.trim()).filter(Boolean).sort().join(',');
    const targetSymptoms = normalizeSymptoms(symptoms);
    const targetCity = (city || '').toLowerCase().trim();

    for (const c of candidates) {
      const candidateSymptoms = normalizeSymptoms(c.symptoms);
      if (candidateSymptoms !== targetSymptoms) continue;

      const candidateCity = (c.city || '').toLowerCase().trim();
      if (candidateCity && targetCity && candidateCity === targetCity) {
        return c;
      }
      if (c.latitude && c.longitude && latitude && longitude) {
        const latDiff = Math.abs(c.latitude - latitude);
        const lngDiff = Math.abs(c.longitude - longitude);
        if (latDiff <= 0.02 && lngDiff <= 0.02) {
          return c;
        }
      }
    }
    return null;
  } catch (error) {
    throw handlePrismaError(error);
  }
}

/**
 * Reuses results from a previously completed discovery task for a new conversation.
 * Copies snapshots, status, and AI final message in a single transaction.
 * @param {string} sourceConvoId - The source conversation ID to copy results from.
 * @param {string} targetConvoId - The target conversation ID.
 * @param {string} summaryMsg - The final AI response message to write.
 */
async function reuseCompletedDiscovery(sourceConvoId, targetConvoId, summaryMsg) {
  try {
    return await prisma.$transaction(async (tx) => {
      const recommendations = await tx.recommendationSnapshot.findMany({
        where: { conversationId: sourceConvoId },
      });

      await tx.conversation.update({
        where: { id: targetConvoId },
        data: {
          status: 'COMPLETED',
          updatedAt: new Date(),
        },
      });

      await tx.patientContext.update({
        where: { conversationId: targetConvoId },
        data: {
          isContextComplete: true,
          updatedAt: new Date(),
        },
      });

      for (const hosp of recommendations) {
        await tx.recommendationSnapshot.create({
          data: {
            conversationId: targetConvoId,
            hospitalName: hosp.hospitalName,
            rankingPosition: hosp.rankingPosition,
            confidenceScore: hosp.confidenceScore,
            trustScore: hosp.trustScore,
            estimatedCost: hosp.estimatedCost,
            distance: hosp.distance,
            latitude: hosp.latitude,
            longitude: hosp.longitude,
            reason: hosp.reason,
            source: hosp.source,
            summary: hosp.summary,
            pros: hosp.pros,
            cons: hosp.cons,
            overallScore: hosp.overallScore,
            travelTime: hosp.travelTime,
            website: hosp.website,
            phone: hosp.phone,
            address: hosp.address,
            hospitalType: hosp.hospitalType,
            accreditations: hosp.accreditations,
            reviewCount: hosp.reviewCount,
            hasEmergency: hosp.hasEmergency,
            hasIcu: hosp.hasIcu,
            estimatedCostRange: hosp.estimatedCostRange,
          },
        });
      }

      await tx.conversationMessage.create({
        data: {
          conversationId: targetConvoId,
          sender: 'AI',
          message: summaryMsg,
          messageType: 'FINAL',
        },
      });
    });
  } catch (error) {
    throw handlePrismaError(error);
  }
}

module.exports = {
  createConversation,
  findConversationById,
  findConversationsByUserId,
  createMessage,
  updatePatientContext,
  softDeleteConversation,
  updateConversation,
  createRecommendationSnapshot,
  findRecommendationSnapshotsByConversationId,
  findCompletedContextMatch,
  reuseCompletedDiscovery,
};
