const { prisma, handlePrismaError } = require('../../config/database');

/**
 * Creates a new saved location for a user.
 * If isDefault is true, unsets any existing default for this user first.
 * @param {string} userId - User UUID.
 * @param {Object} data - Location data.
 * @returns {Promise<Object>} The created saved location.
 */
async function createLocation(userId, data) {
  try {
    return await prisma.$transaction(async (tx) => {
      // If new location is default, unset any existing defaults
      if (data.isDefault) {
        await tx.savedLocation.updateMany({
          where: { userId, isDefault: true },
          data: { isDefault: false },
        });
      }

      return await tx.savedLocation.create({
        data: {
          userId,
          label: data.label,
          formattedAddress: data.formattedAddress,
          latitude: data.latitude || null,
          longitude: data.longitude || null,
          city: data.city || null,
          state: data.state || null,
          country: data.country || null,
          postalCode: data.postalCode || null,
          isDefault: data.isDefault || false,
        },
      });
    });
  } catch (error) {
    throw handlePrismaError(error);
  }
}

/**
 * Finds all saved locations for a user, ordered by default first then by creation.
 * @param {string} userId - User UUID.
 * @returns {Promise<Array>} List of saved locations.
 */
async function findLocationsByUserId(userId) {
  try {
    return await prisma.savedLocation.findMany({
      where: { userId },
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' },
      ],
    });
  } catch (error) {
    throw handlePrismaError(error);
  }
}

/**
 * Finds a single saved location by ID.
 * @param {string} id - Location UUID.
 * @returns {Promise<Object|null>} The saved location or null.
 */
async function findLocationById(id) {
  try {
    return await prisma.savedLocation.findUnique({
      where: { id },
    });
  } catch (error) {
    throw handlePrismaError(error);
  }
}

/**
 * Updates a saved location. Handles default toggling.
 * @param {string} id - Location UUID.
 * @param {string} userId - User UUID (for default toggling scope).
 * @param {Object} data - Fields to update.
 * @returns {Promise<Object>} The updated saved location.
 */
async function updateLocation(id, userId, data) {
  try {
    return await prisma.$transaction(async (tx) => {
      // If setting this as default, unset any existing defaults
      if (data.isDefault) {
        await tx.savedLocation.updateMany({
          where: { userId, isDefault: true, id: { not: id } },
          data: { isDefault: false },
        });
      }

      return await tx.savedLocation.update({
        where: { id },
        data,
      });
    });
  } catch (error) {
    throw handlePrismaError(error);
  }
}

/**
 * Hard deletes a saved location.
 * @param {string} id - Location UUID.
 * @returns {Promise<Object>} The deleted record.
 */
async function deleteLocation(id) {
  try {
    return await prisma.savedLocation.delete({
      where: { id },
    });
  } catch (error) {
    throw handlePrismaError(error);
  }
}

module.exports = {
  createLocation,
  findLocationsByUserId,
  findLocationById,
  updateLocation,
  deleteLocation,
};
