const feedbackRepository = require('./feedback.repository');

/**
 * Creates a new review after ensuring no duplicate exists for the given snapshot.
 * @param {string} userId - Authenticated user ID.
 * @param {Object} data - Review data.
 */
async function createReview(userId, data) {
  // Ensure a review doesn't already exist for this snapshot
  const existingReview = await feedbackRepository.findReviewBySnapshotId(data.recommendationSnapshotId);
  if (existingReview) {
    throw new Error('A review or draft already exists for this recommendation snapshot');
  }

  return await feedbackRepository.createReview(userId, data);
}

/**
 * Updates a review and verifies ownership.
 * @param {string} id - Review ID.
 * @param {string} userId - Authenticated user ID.
 * @param {Object} data - Fields to update.
 */
async function updateReview(id, userId, data) {
  const review = await feedbackRepository.findReviewById(id);
  if (!review) {
    const error = new Error('Review not found');
    error.status = 404;
    throw error;
  }

  if (review.userId !== userId) {
    const error = new Error('Forbidden: You do not own this review');
    error.status = 403;
    throw error;
  }

  // Prevent modifying critical read-only fields on update
  const { userId: _, conversationId: __, recommendationSnapshotId: ___, ...updateData } = data;

  return await feedbackRepository.updateReview(id, updateData);
}

/**
 * Deletes a review and verifies ownership.
 * @param {string} id - Review ID.
 * @param {string} userId - Authenticated user ID.
 */
async function deleteReview(id, userId) {
  const review = await feedbackRepository.findReviewById(id);
  if (!review) {
    const error = new Error('Review not found');
    error.status = 404;
    throw error;
  }

  if (review.userId !== userId) {
    const error = new Error('Forbidden: You do not own this review');
    error.status = 403;
    throw error;
  }

  return await feedbackRepository.deleteReview(id);
}

/**
 * Fetches reviews by conversation ID.
 * @param {string} conversationId - Conversation ID.
 * @param {string} userId - Authenticated user ID.
 */
async function getReviewsByConversationId(conversationId, userId) {
  const reviews = await feedbackRepository.findReviewsByUserId(userId);
  return reviews.filter(r => r.conversationId === conversationId);
}

/**
 * Aggregates reviews for the dashboard.
 * Compiles Completed Reviews, Draft Reviews, and Pending Reviews.
 * @param {string} userId - Authenticated user ID.
 */
async function getReviewsHistory(userId) {
  // 1. Fetch all reviews for this user
  const reviews = await feedbackRepository.findReviewsByUserId(userId);
  const completed = reviews.filter(r => r.status === 'COMPLETED');
  const drafts = reviews.filter(r => r.status === 'DRAFT');

  // 2. Fetch all recommendation snapshots generated for the user
  const snapshots = await feedbackRepository.findRecommendationSnapshotsByUserId(userId);

  // 3. Filter out snapshots that already have a review (draft or completed)
  const reviewedSnapshotIds = new Set(reviews.map(r => r.recommendationSnapshotId));
  const pending = snapshots
    .filter(snap => !reviewedSnapshotIds.has(snap.id))
    .map(snap => ({
      recommendationSnapshotId: snap.id,
      conversationId: snap.conversationId,
      conversationTitle: snap.conversation?.title || 'Consultation Session',
      hospitalName: snap.hospitalName,
      estimatedCost: snap.estimatedCost,
      createdAt: snap.createdAt,
    }));

  return {
    completed,
    drafts,
    pending,
  };
}

module.exports = {
  createReview,
  updateReview,
  deleteReview,
  getReviewsByConversationId,
  getReviewsHistory,
};
