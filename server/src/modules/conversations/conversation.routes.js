const express = require('express');
const conversationController = require('./conversation.controller');
const validate = require('../../middleware/validation.middleware');
const { verifyFirebaseToken } = require('../auth/auth.middleware');
const {
  createConversationSchema,
  sendMessageSchema,
  conversationIdSchema,
} = require('./conversation.validation');

const router = express.Router();

// All conversation routes require authentication
router.use(verifyFirebaseToken);

// Create new conversation
router.post(
  '/',
  validate({ body: createConversationSchema }),
  conversationController.createConversation
);

// List user conversations
router.get(
  '/',
  conversationController.listConversations
);

// Get conversation details (metadata + messages + context)
router.get(
  '/:id',
  validate({ params: conversationIdSchema }),
  conversationController.getConversationDetails
);

// Send message to conversation
router.post(
  '/:id/messages',
  validate({ params: conversationIdSchema, body: sendMessageSchema }),
  conversationController.sendMessage
);

// Soft delete conversation
router.delete(
  '/:id',
  validate({ params: conversationIdSchema }),
  conversationController.softDeleteConversation
);

module.exports = router;
