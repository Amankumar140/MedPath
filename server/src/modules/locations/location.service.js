const axios = require('axios');
const locationRepository = require('./location.repository');
const logger = require('../../config/logger');

/**
 * Creates a new saved location for the user.
 * @param {string} userId - User UUID.
 * @param {Object} data - Location data.
 * @returns {Promise<Object>} The created location.
 */
async function createLocation(userId, data) {
  const location = await locationRepository.createLocation(userId, data);
  logger.info(`📍 Saved location created: ID=${location.id}, UserID=${userId}, Label="${data.label}"`);
  return location;
}

/**
 * Lists all saved locations for a user.
 * @param {string} userId - User UUID.
 * @returns {Promise<Array>} List of saved locations.
 */
async function listLocations(userId) {
  return await locationRepository.findLocationsByUserId(userId);
}

/**
 * Updates a saved location with ownership verification.
 * @param {string} id - Location UUID.
 * @param {string} userId - Requesting user UUID.
 * @param {Object} data - Fields to update.
 * @returns {Promise<Object>} The updated location.
 */
async function updateLocation(id, userId, data) {
  const existing = await locationRepository.findLocationById(id);
  if (!existing) {
    const error = new Error('Saved location not found');
    error.statusCode = 404;
    throw error;
  }

  if (existing.userId !== userId) {
    const error = new Error('Forbidden: You do not own this saved location');
    error.statusCode = 403;
    throw error;
  }

  const updated = await locationRepository.updateLocation(id, userId, data);
  logger.info(`📍 Saved location updated: ID=${id}`);
  return updated;
}

/**
 * Deletes a saved location with ownership verification.
 * @param {string} id - Location UUID.
 * @param {string} userId - Requesting user UUID.
 * @returns {Promise<Object>} The deleted record.
 */
async function deleteLocation(id, userId) {
  const existing = await locationRepository.findLocationById(id);
  if (!existing) {
    const error = new Error('Saved location not found');
    error.statusCode = 404;
    throw error;
  }

  if (existing.userId !== userId) {
    const error = new Error('Forbidden: You do not own this saved location');
    error.statusCode = 403;
    throw error;
  }

  await locationRepository.deleteLocation(id);
  logger.info(`🗑️ Saved location deleted: ID=${id}`);
  return { success: true };
}

/**
 * Reverse geocodes GPS coordinates into a structured address using OpenStreetMap Nominatim.
 * @param {number} latitude - GPS latitude.
 * @param {number} longitude - GPS longitude.
 * @returns {Promise<Object>} Structured address data.
 */
async function resolveCoordinates(latitude, longitude) {
  try {
    const response = await axios.get('https://nominatim.openstreetmap.org/reverse', {
      params: {
        lat: latitude,
        lon: longitude,
        format: 'json',
        addressdetails: 1,
      },
      headers: {
        'User-Agent': 'MedPath-Healthcare-App/1.0',
      },
      timeout: 10000,
    });

    const data = response.data;
    const address = data.address || {};

    const result = {
      formattedAddress: data.display_name || `${latitude}, ${longitude}`,
      locality: address.suburb || address.neighbourhood || address.hamlet || null,
      city: address.city || address.town || address.village || address.county || null,
      state: address.state || null,
      country: address.country || null,
      postalCode: address.postcode || null,
      latitude,
      longitude,
    };

    logger.info(`📍 Reverse geocoded: (${latitude}, ${longitude}) → ${result.city || result.formattedAddress}`);
    return result;
  } catch (error) {
    logger.error(`❌ Reverse geocoding failed for (${latitude}, ${longitude}):`, error.message);

    // Return a fallback with raw coordinates
    return {
      formattedAddress: `${latitude}, ${longitude}`,
      locality: null,
      city: null,
      state: null,
      country: null,
      postalCode: null,
      latitude,
      longitude,
    };
  }
}

module.exports = {
  createLocation,
  listLocations,
  updateLocation,
  deleteLocation,
  resolveCoordinates,
};
