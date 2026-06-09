const authService = require('./auth.service');

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
 * /auth/login:
 *   post:
 *     summary: Verify Firebase Token and Login
 *     description: Accepts a Firebase ID token, verifies it, creates/updates the user profile in PostgreSQL, and returns the profile.
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - idToken
 *             properties:
 *               idToken:
 *                 type: string
 *                 description: Valid Firebase ID Token
 *                 example: "eyJhbGciOiJSUzI1NiIsImtpZCI6..."
 *     responses:
 *       200:
 *         description: Login successful, returns user profile
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
 *         description: Validation error (e.g. missing idToken)
 *       401:
 *         description: Unauthorized (invalid/expired Firebase token)
 *       403:
 *         description: Forbidden (user account is deactivated)
 */
async function login(req, res, next) {
  try {
    const { idToken } = req.body;
    const user = await authService.loginWithToken(idToken);
    
    return res.status(200).json({
      success: true,
      data: sanitizeProfile(user),
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Stateless Logout
 *     description: Stateless logout endpoint. Client is responsible for discarding the Firebase token.
 *     tags:
 *       - Authentication
 *     responses:
 *       200:
 *         description: Logout successful
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
 *                   example: Logged out successfully
 */
async function logout(req, res, next) {
  try {
    return res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Get Authenticated User Details
 *     description: Returns the user profile details for the currently authenticated Firebase session.
 *     tags:
 *       - Authentication
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
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
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
async function me(req, res, next) {
  try {
    return res.status(200).json({
      success: true,
      data: sanitizeProfile(req.user),
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  login,
  logout,
  me,
};
