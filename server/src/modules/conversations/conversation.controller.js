const conversationService = require('./conversation.service');
const logger = require('../../config/logger');

/**
 * @swagger
 * components:
 *   schemas:
 *     Conversation:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           example: "d290f1ee-6c54-4b01-90e6-d701748f0851"
 *         userId:
 *           type: string
 *           format: uuid
 *           example: "c460f1ee-6c54-4b01-90e6-d701748f0852"
 *         title:
 *           type: string
 *           example: "Chest pain and mild fever"
 *         status:
 *           type: string
 *           enum: [ACTIVE, COMPLETED, ARCHIVED]
 *           example: "ACTIVE"
 *         detectedLanguage:
 *           type: string
 *           nullable: true
 *           example: "en"
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: "2026-06-26T15:07:10Z"
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           example: "2026-06-26T15:07:10Z"
 *     ConversationMessage:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           example: "f590f1ee-6c54-4b01-90e6-d701748f0853"
 *         conversationId:
 *           type: string
 *           format: uuid
 *           example: "d290f1ee-6c54-4b01-90e6-d701748f0851"
 *         sender:
 *           type: string
 *           enum: [USER, AI, SYSTEM]
 *           example: "USER"
 *         message:
 *           type: string
 *           example: "I have had a headache for two days."
 *         messageType:
 *           type: string
 *           enum: [TEXT, STATUS, FOLLOW_UP, FINAL]
 *           example: "TEXT"
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: "2026-06-26T15:07:12Z"
 *     PatientContext:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           example: "e590f1ee-6c54-4b01-90e6-d701748f0854"
 *         conversationId:
 *           type: string
 *           format: uuid
 *           example: "d290f1ee-6c54-4b01-90e6-d701748f0851"
 *         symptoms:
 *           type: string
 *           nullable: true
 *           example: "Headache, nausea"
 *         age:
 *           type: integer
 *           nullable: true
 *           example: 34
 *         durationDays:
 *           type: integer
 *           nullable: true
 *           example: 2
 *         location:
 *           type: string
 *           nullable: true
 *           example: "Boston"
 *         careIntent:
 *           type: string
 *           nullable: true
 *           example: "General consultation"
 *         budget:
 *           type: string
 *           nullable: true
 *           example: "Flexible"
 *         detectedLanguage:
 *           type: string
 *           nullable: true
 *           example: "en"
 *         isContextComplete:
 *           type: boolean
 *           example: false
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: "2026-06-26T15:07:10Z"
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           example: "2026-06-26T15:07:10Z"
 */

/**
 * @swagger
 * /conversations:
 *   post:
 *     summary: Create new conversation
 *     description: Initializes a conversation session for the authenticated user and maps an empty patient context.
 *     tags:
 *       - Conversations
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 description: Title of the conversation session
 *                 example: "Headache consultation"
 *     responses:
 *       201:
 *         description: Conversation created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Conversation'
 *       401:
 *         description: Unauthorized
 *       400:
 *         description: Validation error
 */
async function createConversation(req, res, next) {
  try {
    const { title, latitude, longitude, formattedAddress, city } = req.body;
    const conversation = await conversationService.createConversation(req.user.id, {
      title,
      latitude,
      longitude,
      formattedAddress,
      city,
    });
    
    return res.status(201).json({
      success: true,
      data: conversation,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @swagger
 * /conversations:
 *   get:
 *     summary: List user conversations
 *     description: Retrieves all active conversations belonging to the authenticated user. Excludes soft-deleted ones.
 *     tags:
 *       - Conversations
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved conversations list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Conversation'
 *       401:
 *         description: Unauthorized
 */
async function listConversations(req, res, next) {
  try {
    const conversations = await conversationService.listUserConversations(req.user.id);
    
    return res.status(200).json({
      success: true,
      data: conversations,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @swagger
 * /conversations/{id}:
 *   get:
 *     summary: Get conversation details
 *     description: Retrieves metadata, full message history, and structured patient context for a conversation.
 *     tags:
 *       - Conversations
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The conversation UUID
 *     responses:
 *       200:
 *         description: Successfully retrieved conversation details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     conversation:
 *                       $ref: '#/components/schemas/Conversation'
 *                     messages:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/ConversationMessage'
 *                     patientContext:
 *                       $ref: '#/components/schemas/PatientContext'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - ownership validation failed
 *       404:
 *         description: Conversation not found
 */
async function getConversationDetails(req, res, next) {
  try {
    const { id } = req.params;
    const details = await conversationService.getConversationDetails(id, req.user.id);
    
    return res.status(200).json({
      success: true,
      data: details,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @swagger
 * /conversations/{id}/messages:
 *   post:
 *     summary: Post a message to conversation (Supports SSE Streaming)
 *     description: Saves a user message, forwards it to the Python AI service. If the Accept header is set to `text/event-stream`, responses are streamed chunk-by-chunk in Server-Sent Events (SSE) format. Otherwise, responds with standard HTTP once processing completes.
 *     tags:
 *       - Conversations
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The conversation UUID
 *       - in: header
 *         name: Accept
 *         schema:
 *           type: string
 *           enum: [application/json, text/event-stream]
 *         description: Request Event-Stream format to enable streaming mode.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - message
 *             properties:
 *               message:
 *                 type: string
 *                 description: Message text content
 *                 example: "I am experiencing severe abdominal pain since yesterday."
 *     responses:
 *       200:
 *         description: Message sent successfully and AI response received (or SSE stream started)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     conversation:
 *                       $ref: '#/components/schemas/Conversation'
 *                     messages:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/ConversationMessage'
 *                     patientContext:
 *                       $ref: '#/components/schemas/PatientContext'
 *           text/event-stream:
 *             schema:
 *               type: string
 *               description: "Streaming JSON lines formatted as SSE chunks (data: {...}\\n\\n)"
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - ownership validation failed
 *       404:
 *         description: Conversation not found
 */
async function sendMessage(req, res, next) {
  try {
    const { id } = req.params;
    const { message } = req.body;
    const acceptHeader = req.headers.accept;

    const stream = await conversationService.sendMessage(id, req.user.id, message);

    if (acceptHeader && acceptHeader.includes('text/event-stream')) {
      // 1. Server-Sent Events (SSE) Streaming Route
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders();

      stream.on('data', (chunk) => {
        const text = chunk.toString();
        // Split chunk by lines since Python streams line-separated JSON strings
        const lines = text.split('\n').filter((l) => l.trim() !== '');
        for (const line of lines) {
          res.write(`data: ${line}\n\n`);
        }
      });

      stream.on('end', () => {
        res.write('event: end\ndata: Stream complete\n\n');
        res.end();
      });

      stream.on('error', (err) => {
        logger.error(`❌ SSE stream error for conversation ${id}:`, err.message);
        res.write(`event: error\ndata: ${JSON.stringify({ error: err.message })}\n\n`);
        res.end();
      });
    } else {
      // 2. Standard JSON HTTP Response Route (Buffers stream under the hood)
      let accumulated = '';
      
      stream.on('data', (chunk) => {
        accumulated += chunk.toString();
      });

      stream.on('end', async () => {
        try {
          const details = await conversationService.getConversationDetails(id, req.user.id);
          return res.status(200).json({
            success: true,
            data: details,
          });
        } catch (err) {
          next(err);
        }
      });

      stream.on('error', (err) => {
        next(err);
      });
    }
  } catch (error) {
    next(error);
  }
}

/**
 * @swagger
 * /conversations/{id}:
 *   delete:
 *     summary: Soft delete conversation
 *     description: Flags a conversation as deleted, preventing it from showing in user lists.
 *     tags:
 *       - Conversations
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The conversation UUID
 *     responses:
 *       200:
 *         description: Conversation deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Conversation soft-deleted successfully"
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - ownership validation failed
 *       404:
 *         description: Conversation not found
 */
async function softDeleteConversation(req, res, next) {
  try {
    const { id } = req.params;
    await conversationService.softDeleteConversation(id, req.user.id);
    
    return res.status(200).json({
      success: true,
      message: 'Conversation soft-deleted successfully',
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createConversation,
  listConversations,
  getConversationDetails,
  sendMessage,
  softDeleteConversation,
};
