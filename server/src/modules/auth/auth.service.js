const firebaseAdmin = require('../../config/firebase');
const userRepository = require('../users/user.repository');
const logger = require('../../config/logger');

/**
 * Service to process Firebase ID Token login.
 * Verifies the token, fetches or creates the user profile, updates login timestamps,
 * and handles account deactivation.
 * @param {string} idToken - The Firebase ID Token from the client.
 * @returns {Promise<Object>} The authenticated user profile.
 */
async function loginWithToken(idToken) {
  if (!firebaseAdmin) {
    throw new Error('Firebase Admin SDK is not initialized');
  }

  // 1. Verify the Firebase ID Token
  let decodedToken;
  try {
    decodedToken = await firebaseAdmin.auth().verifyIdToken(idToken);
  } catch (error) {
    logger.warn(`🔐 Login failure: Firebase token verification failed: ${error.message}`);
    const authError = new Error(`Invalid or expired Firebase token: ${error.message}`);
    authError.statusCode = 401;
    throw authError;
  }

  const { uid, email, name, picture, phone_number } = decodedToken;

  if (!email) {
    logger.warn(`🔐 Login failure: Firebase ID Token does not contain an email address for UID: ${uid}`);
    const emailError = new Error('Email address is required from identity provider');
    emailError.statusCode = 400;
    throw emailError;
  }

  // 2. Fetch the user profile from the database
  let user = await userRepository.findByFirebaseUid(uid);

  const now = new Date();

  if (!user) {
    // 3. Create a user profile on first login (Sign-Up)
    logger.info(`👤 Creating new user profile for Firebase UID: ${uid}, Email: ${email}`);
    user = await userRepository.createUser({
      firebaseUid: uid,
      email,
      displayName: name || null,
      photoUrl: picture || null,
      phoneNumber: phone_number || null,
      preferredLanguage: 'en',
      lastLoginAt: now,
      onboardingCompleted: false,
    });
    
    logger.info(`🔐 Login success: New user registered and logged in successfully: ${email}`, {
      firebaseUid: uid,
      userId: user.id,
    });
  } else {
    // 4. Handle inactive/deactivated users
    if (!user.isActive) {
      logger.warn(`🔐 Login failure: User account is inactive for Firebase UID: ${uid}`);
      const deactiveError = new Error('User account is deactivated. Please contact support.');
      deactiveError.statusCode = 403;
      throw deactiveError;
    }

    // 5. Update last login timestamp for existing users
    user = await userRepository.updateUser(uid, {
      lastLoginAt: now,
    });

    logger.info(`🔐 Login success: Existing user logged in successfully: ${email}`, {
      firebaseUid: uid,
      userId: user.id,
    });
  }

  return user;
}

module.exports = {
  loginWithToken,
};
