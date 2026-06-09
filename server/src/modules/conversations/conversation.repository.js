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
};
