const { prisma, handlePrismaError } = require('../../config/database');

/**
 * Creates a new HospitalReview record.
 * @param {string} userId - User UUID.
 * @param {Object} data - Review details.
 * @returns {Promise<Object>} The created review.
 */
async function createReview(userId, data) {
  try {
    return await prisma.hospitalReview.create({
      data: {
        userId,
        conversationId: data.conversationId,
        recommendationSnapshotId: data.recommendationSnapshotId,
        hospitalName: data.hospitalName,
        visited: data.visited !== undefined ? data.visited : null,
        treatmentType: data.treatmentType || null,
        estimatedCost: data.estimatedCost || null,
        actualCost: data.actualCost !== undefined ? data.actualCost : null,
        costAccuracy: data.costAccuracy || null,
        doctorQuality: data.doctorQuality !== undefined ? data.doctorQuality : null,
        diagnosisExplanation: data.diagnosisExplanation !== undefined ? data.diagnosisExplanation : null,
        waitingTimeRating: data.waitingTimeRating !== undefined ? data.waitingTimeRating : null,
        facilityRating: data.facilityRating !== undefined ? data.facilityRating : null,
        staffRating: data.staffRating !== undefined ? data.staffRating : null,
        billingTransparency: data.billingTransparency !== undefined ? data.billingTransparency : null,
        hiddenCharges: data.hiddenCharges || null,
        specialtyMatch: data.specialtyMatch !== undefined ? data.specialtyMatch : null,
        medpathAccuracy: data.medpathAccuracy !== undefined ? data.medpathAccuracy : null,
        hospitalRecommendation: data.hospitalRecommendation || null,
        reviewText: data.reviewText || null,
        status: data.status || 'DRAFT',
      },
    });
  } catch (error) {
    throw handlePrismaError(error);
  }
}

/**
 * Finds a review by its ID.
 * @param {string} id - Review UUID.
 * @returns {Promise<Object|null>} The review or null.
 */
async function findReviewById(id) {
  try {
    return await prisma.hospitalReview.findUnique({
      where: { id },
    });
  } catch (error) {
    throw handlePrismaError(error);
  }
}

/**
 * Finds a review by recommendationSnapshotId.
 * @param {string} recommendationSnapshotId - Snapshot UUID.
 * @returns {Promise<Object|null>} The review or null.
 */
async function findReviewBySnapshotId(recommendationSnapshotId) {
  try {
    return await prisma.hospitalReview.findUnique({
      where: { recommendationSnapshotId },
    });
  } catch (error) {
    throw handlePrismaError(error);
  }
}

/**
 * Finds all reviews written by a user.
 * @param {string} userId - User UUID.
 * @returns {Promise<Array>} List of reviews.
 */
async function findReviewsByUserId(userId) {
  try {
    return await prisma.hospitalReview.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });
  } catch (error) {
    throw handlePrismaError(error);
  }
}

/**
 * Finds all recommendation snapshots for active conversations belonging to a user.
 * @param {string} userId - User UUID.
 * @returns {Promise<Array>} List of recommendation snapshots.
 */
async function findRecommendationSnapshotsByUserId(userId) {
  try {
    return await prisma.recommendationSnapshot.findMany({
      where: {
        conversation: {
          userId,
          deletedAt: null,
        },
      },
      include: {
        conversation: {
          select: {
            title: true,
            updatedAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  } catch (error) {
    throw handlePrismaError(error);
  }
}

/**
 * Updates an existing review.
 * @param {string} id - Review UUID.
 * @param {Object} data - Update payload.
 * @returns {Promise<Object>} The updated review.
 */
async function updateReview(id, data) {
  try {
    return await prisma.hospitalReview.update({
      where: { id },
      data,
    });
  } catch (error) {
    throw handlePrismaError(error);
  }
}

/**
 * Deletes a review.
 * @param {string} id - Review UUID.
 * @returns {Promise<Object>} The deleted review.
 */
async function deleteReview(id) {
  try {
    return await prisma.hospitalReview.delete({
      where: { id },
    });
  } catch (error) {
    throw handlePrismaError(error);
  }
}

module.exports = {
  createReview,
  findReviewById,
  findReviewBySnapshotId,
  findReviewsByUserId,
  findRecommendationSnapshotsByUserId,
  updateReview,
  deleteReview,
};
