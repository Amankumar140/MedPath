const userService = require('./user.service');

/**
 * Helper to sanitize and format user profile responses.
 * @param {Object} user - The user database object.
 * @returns {Object} Sanitized user profile.
 */
function sanitizeProfile(user) {
  if (!user) return null;
  return {
    id: user.id,
    firebaseUid: user.firebaseUid,
    email: user.email,
    displayName: user.displayName,
    fullName: user.displayName, // Map displayName to fullName for client convenience
    photoUrl: user.photoUrl,
    phoneNumber: user.phoneNumber,
    preferredLanguage: user.preferredLanguage,
    onboardingCompleted: user.onboardingCompleted,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    lastLoginAt: user.lastLoginAt,
    isActive: user.isActive,
  };
}

/**
 * @swagger
 * /users/profile:
 *   get:
 *     summary: Retrieve current user profile
 *     description: Returns the details of the currently authenticated user derived from the Firebase token.
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/UserProfile'
 *       401:
 *         description: Unauthorized - missing, invalid, or expired token
 *       403:
 *         description: Forbidden - user account is deactivated
 */
async function getProfile(req, res, next) {
  try {
    return res.status(200).json({
      success: true,
      data: sanitizeProfile(req.user),
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @swagger
 * /users/profile:
 *   patch:
 *     summary: Update user profile
 *     description: Updates the allowed profile fields for the currently authenticated user.
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullName:
 *                 type: string
 *                 description: Display name of the user
 *                 example: Jane Doe
 *               preferredLanguage:
 *                 type: string
 *                 description: Preferred language code
 *                 example: en
 *               phoneNumber:
 *                 type: string
 *                 description: Contact phone number
 *                 example: "+15550199"
 *             additionalProperties: false
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/UserProfile'
 *       400:
 *         description: Validation error or invalid request body
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
async function updateProfile(req, res, next) {
  try {
    const updatedUser = await userService.updateProfile(req.user.firebaseUid, req.body);
    return res.status(200).json({
      success: true,
      data: sanitizeProfile(updatedUser),
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @swagger
 * /users/profile:
 *   delete:
 *     summary: Deactivate user profile (Soft Delete)
 *     description: Deactivates the currently authenticated user account by setting isActive to false.
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Account deactivated successfully
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
 *                   example: User profile deactivated successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
async function deactivateProfile(req, res, next) {
  try {
    await userService.deactivateUser(req.user.firebaseUid);
    return res.status(200).json({
      success: true,
      message: 'User profile deactivated successfully',
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getProfile,
  updateProfile,
  deactivateProfile,
};

/**
 * @swagger
 * components:
 *   schemas:
 *     UserProfile:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           example: "d290f1ee-6c54-4b01-90e6-d701748f0851"
 *         firebaseUid:
 *           type: string
 *           example: "firebase-uid-abc-123"
 *         email:
 *           type: string
 *           format: email
 *           example: "jane.doe@example.com"
 *         displayName:
 *           type: string
 *           nullable: true
 *           example: "Jane Doe"
 *         fullName:
 *           type: string
 *           nullable: true
 *           example: "Jane Doe"
 *         photoUrl:
 *           type: string
 *           format: uri
 *           nullable: true
 *           example: "https://example.com/photo.jpg"
 *         phoneNumber:
 *           type: string
 *           nullable: true
 *           example: "+15550199"
 *         preferredLanguage:
 *           type: string
 *           example: "en"
 *         onboardingCompleted:
 *           type: boolean
 *           example: false
 *         isActive:
 *           type: boolean
 *           example: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: "2026-06-26T15:07:10Z"
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           example: "2026-06-26T15:07:10Z"
 *         lastLoginAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           example: "2026-06-26T15:10:00Z"
 */
