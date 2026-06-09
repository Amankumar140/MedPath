const feedbackService = require('./feedback.service');

/**
 * GET /api/v1/reviews/history
 * Fetch aggregated Completed, Draft, and Pending reviews for the authenticated user.
 */
async function getReviewsHistory(req, res, next) {
  try {
    const history = await feedbackService.getReviewsHistory(req.user.id);
    return res.status(200).json({
      success: true,
      data: history,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/reviews/:conversationId
 * Fetch reviews associated with a specific consultation session.
 */
async function getReviewsByConversationId(req, res, next) {
  try {
    const { conversationId } = req.params;
    const reviews = await feedbackService.getReviewsByConversationId(conversationId, req.user.id);
    return res.status(200).json({
      success: true,
      data: reviews,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/reviews
 * Create a new hospital review (starts as DRAFT or can be directly COMPLETED).
 */
async function createReview(req, res, next) {
  try {
    const review = await feedbackService.createReview(req.user.id, req.body);
    return res.status(201).json({
      success: true,
      data: review,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/v1/reviews/:id
 * Update an existing review draft or submit it as completed.
 */
async function updateReview(req, res, next) {
  try {
    const { id } = req.params;
    const updated = await feedbackService.updateReview(id, req.user.id, req.body);
    return res.status(200).json({
      success: true,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/v1/reviews/:id
 * Delete a review draft or completed review.
 */
async function deleteReview(req, res, next) {
  try {
    const { id } = req.params;
    await feedbackService.deleteReview(id, req.user.id);
    return res.status(200).json({
      success: true,
      message: 'Review deleted successfully',
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getReviewsHistory,
  getReviewsByConversationId,
  createReview,
  updateReview,
  deleteReview,
};
