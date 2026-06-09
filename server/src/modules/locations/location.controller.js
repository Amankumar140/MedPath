const locationService = require('./location.service');

/**
 * GET /locations
 * List all saved locations for the authenticated user.
 */
async function listLocations(req, res, next) {
  try {
    const locations = await locationService.listLocations(req.user.id);
    return res.status(200).json({
      success: true,
      data: locations,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /locations
 * Create a new saved location.
 */
async function createLocation(req, res, next) {
  try {
    const location = await locationService.createLocation(req.user.id, req.body);
    return res.status(201).json({
      success: true,
      data: location,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /locations/:id
 * Update an existing saved location.
 */
async function updateLocation(req, res, next) {
  try {
    const { id } = req.params;
    const updated = await locationService.updateLocation(id, req.user.id, req.body);
    return res.status(200).json({
      success: true,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /locations/:id
 * Delete a saved location.
 */
async function deleteLocation(req, res, next) {
  try {
    const { id } = req.params;
    await locationService.deleteLocation(id, req.user.id);
    return res.status(200).json({
      success: true,
      message: 'Saved location deleted successfully',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /location/current
 * Reverse geocode GPS coordinates into a structured address.
 */
async function resolveCurrentLocation(req, res, next) {
  try {
    const { latitude, longitude } = req.body;
    const resolved = await locationService.resolveCoordinates(latitude, longitude);
    return res.status(200).json({
      success: true,
      data: resolved,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listLocations,
  createLocation,
  updateLocation,
  deleteLocation,
  resolveCurrentLocation,
};
