const express = require('express');
const locationController = require('./location.controller');
const validate = require('../../middleware/validation.middleware');
const { verifyFirebaseToken } = require('../auth/auth.middleware');
const {
  createLocationSchema,
  updateLocationSchema,
  locationIdSchema,
  resolveCoordinatesSchema,
} = require('./location.validation');

const router = express.Router();

// All location routes require authentication
router.use(verifyFirebaseToken);

// List all saved locations
router.get(
  '/',
  locationController.listLocations
);

// Create a new saved location
router.post(
  '/',
  validate({ body: createLocationSchema }),
  locationController.createLocation
);

// Resolve current GPS coordinates to address
router.post(
  '/current',
  validate({ body: resolveCoordinatesSchema }),
  locationController.resolveCurrentLocation
);

// Update a saved location
router.patch(
  '/:id',
  validate({ params: locationIdSchema, body: updateLocationSchema }),
  locationController.updateLocation
);

// Delete a saved location
router.delete(
  '/:id',
  validate({ params: locationIdSchema }),
  locationController.deleteLocation
);

module.exports = router;
