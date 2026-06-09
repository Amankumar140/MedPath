const { z } = require('zod');

/**
 * Zod schema for conversation creation body.
 * Validates that an optional title is a string and not too long.
 */
const createConversationSchema = z.object({
  title: z.string()
    .trim()
    .max(200, 'Title cannot exceed 200 characters')
    .optional(),
  latitude: z.number()
    .min(-90, 'Latitude must be between -90 and 90')
    .max(90, 'Latitude must be between -90 and 90')
    .optional()
    .nullable(),
  longitude: z.number()
    .min(-180, 'Longitude must be between -180 and 180')
    .max(180, 'Longitude must be between -180 and 180')
    .optional()
    .nullable(),
  formattedAddress: z.string()
    .trim()
    .max(500, 'Address too long')
    .optional()
    .nullable(),
  city: z.string()
    .trim()
    .max(100, 'City name too long')
    .optional()
    .nullable(),
}).strict();

/**
 * Zod schema for sending a message in a conversation.
 * Validates that the message field is present and non-empty.
 */
const sendMessageSchema = z.object({
  message: z.string({
    required_error: 'Message text is required',
    invalid_type_error: 'Message text must be a string',
  }).trim().min(1, 'Message text cannot be empty'),
}).strict();

/**
 * Zod schema for URL parameters containing a conversation ID.
 * Validates that the ID is a valid UUID format.
 */
const conversationIdSchema = z.object({
  id: z.string({
    required_error: 'Conversation ID is required',
  }).uuid('Invalid Conversation ID format. Must be a valid UUID.'),
});

module.exports = {
  createConversationSchema,
  sendMessageSchema,
  conversationIdSchema,
};
