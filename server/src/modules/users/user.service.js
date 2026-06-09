const userRepository = require('./user.repository');
const logger = require('../../config/logger');

/**
 * Update user profile details.
 * Maps 'fullName' to 'displayName' in the database.
 * @param {string} firebaseUid - The unique Firebase UID of the user.
 * @param {Object} updateData - Object containing fields to update.
 * @returns {Promise<Object>} The updated and sanitized user profile.
 */
async function updateProfile(firebaseUid, updateData) {
  const dataToUpdate = {};
  
  if (updateData.fullName !== undefined) {
    dataToUpdate.displayName = updateData.fullName;
  }
  if (updateData.preferredLanguage !== undefined) {
    dataToUpdate.preferredLanguage = updateData.preferredLanguage;
  }
  if (updateData.phoneNumber !== undefined) {
    dataToUpdate.phoneNumber = updateData.phoneNumber;
  }

  const updatedUser = await userRepository.updateUser(firebaseUid, dataToUpdate);
  
  logger.info(`👤 Profile update success: User profile updated for Firebase UID: ${firebaseUid}`, {
    firebaseUid,
    updatedFields: Object.keys(dataToUpdate),
  });

  return updatedUser;
}

/**
 * Deactivate a user profile (soft delete).
 * @param {string} firebaseUid - The unique Firebase UID of the user.
 * @returns {Promise<Object>} The deactivated user profile.
 */
async function deactivateUser(firebaseUid) {
  const deactivatedUser = await userRepository.softDeleteUser(firebaseUid);
  
  logger.info(`⚠️ User deactivation success: User account deactivated for Firebase UID: ${firebaseUid}`, {
    firebaseUid,
    userId: deactivatedUser.id,
  });

  return deactivatedUser;
}

module.exports = {
  updateProfile,
  deactivateUser,
};
