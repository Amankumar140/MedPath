const express = require('express');
const feedbackController = require('./feedback.controller');
const validate = require('../../middleware/validation.middleware');
const { verifyFirebaseToken } = require('../auth/auth.middleware');
const {
  createReviewSchema,
  updateReviewSchema,
  reviewIdSchema,
  conversationIdSchema,
} = require('./feedback.validation');

const router = express.Router();

// All feedback/review routes require authentication
router.use(verifyFirebaseToken);

// Get reviews history (Completed, Draft, and Pending)
router.get(
  '/history',
  feedbackController.getReviewsHistory
);

// Get reviews for a specific conversation ID
router.get(
  '/:conversationId',
  validate({ params: conversationIdSchema }),
  feedbackController.getReviewsByConversationId
);

// Create a new review (draft or completed)
router.post(
  '/',
  validate({ body: createReviewSchema }),
  feedbackController.createReview
);

// Update a review (e.g. update draft or complete it)
router.patch(
  '/:id',
  validate({ params: reviewIdSchema, body: updateReviewSchema }),
  feedbackController.updateReview
);

// Delete a review
router.delete(
  '/:id',
  validate({ params: reviewIdSchema }),
  feedbackController.deleteReview
);

module.exports = router;
