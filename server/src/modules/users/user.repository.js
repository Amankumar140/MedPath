const { prisma, handlePrismaError } = require('../../config/database');

/**
 * Find a user by their Firebase UID.
 * @param {string} firebaseUid - The unique Firebase UID.
 * @returns {Promise<Object|null>} The user profile object or null.
 */
async function findByFirebaseUid(firebaseUid) {
  try {
    return await prisma.user.findUnique({
      where: { firebaseUid },
    });
  } catch (error) {
    throw handlePrismaError(error);
  }
}

/**
 * Create a new user profile.
 * @param {Object} data - The user creation data.
 * @returns {Promise<Object>} The created user profile.
 */
async function createUser(data) {
  try {
    return await prisma.user.create({
      data,
    });
  } catch (error) {
    throw handlePrismaError(error);
  }
}

/**
 * Update a user's profile.
 * @param {string} firebaseUid - The unique Firebase UID of the user.
 * @param {Object} data - The fields to update.
 * @returns {Promise<Object>} The updated user profile.
 */
async function updateUser(firebaseUid, data) {
  try {
    return await prisma.user.update({
      where: { firebaseUid },
      data,
    });
  } catch (error) {
    throw handlePrismaError(error);
  }
}

/**
 * Find a user by their database UUID.
 * @param {string} id - The database UUID.
 * @returns {Promise<Object|null>} The user profile object or null.
 */
async function findById(id) {
  try {
    return await prisma.user.findUnique({
      where: { id },
    });
  } catch (error) {
    throw handlePrismaError(error);
  }
}

/**
 * Deactivate a user (soft delete).
 * @param {string} firebaseUid - The unique Firebase UID of the user to deactivate.
 * @returns {Promise<Object>} The deactivated user profile.
 */
async function softDeleteUser(firebaseUid) {
  try {
    return await prisma.user.update({
      where: { firebaseUid },
      data: { isActive: false },
    });
  } catch (error) {
    throw handlePrismaError(error);
  }
}

module.exports = {
  findByFirebaseUid,
  createUser,
  updateUser,
  findById,
  softDeleteUser,
};
