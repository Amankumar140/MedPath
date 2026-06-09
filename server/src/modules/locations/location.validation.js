const { z } = require('zod');

/**
 * Zod schema for creating a new saved location.
 */
const createLocationSchema = z.object({
  label: z.string({
    required_error: 'Label is required',
  }).trim().min(1, 'Label cannot be empty').max(50, 'Label cannot exceed 50 characters'),

  formattedAddress: z.string({
    required_error: 'Formatted address is required',
  }).trim().min(1, 'Formatted address cannot be empty').max(500, 'Address too long'),

  latitude: z.number()
    .min(-90, 'Latitude must be between -90 and 90')
    .max(90, 'Latitude must be between -90 and 90')
    .optional()
    .nullable(),

  longitude: z.number()
    .min(-180, 'Longitude must be between -180 and 180')
    .max(180, 'Longitude must be between -180 and 180')
    .optional()
    .nullable(),

  city: z.string().trim().max(100).optional().nullable(),
  state: z.string().trim().max(100).optional().nullable(),
  country: z.string().trim().max(100).optional().nullable(),

  postalCode: z.string()
    .trim()
    .max(20, 'Postal code too long')
    .optional()
    .nullable(),

  isDefault: z.boolean().optional().default(false),
}).strict();

/**
 * Zod schema for updating a saved location (all fields optional).
 */
const updateLocationSchema = z.object({
  label: z.string().trim().min(1).max(50).optional(),
  formattedAddress: z.string().trim().min(1).max(500).optional(),

  latitude: z.number()
    .min(-90, 'Latitude must be between -90 and 90')
    .max(90, 'Latitude must be between -90 and 90')
    .optional()
    .nullable(),

  longitude: z.number()
    .min(-180, 'Longitude must be between -180 and 180')
    .max(180, 'Longitude must be between -180 and 180')
    .optional()
    .nullable(),

  city: z.string().trim().max(100).optional().nullable(),
  state: z.string().trim().max(100).optional().nullable(),
  country: z.string().trim().max(100).optional().nullable(),
  postalCode: z.string().trim().max(20).optional().nullable(),
  isDefault: z.boolean().optional(),
}).strict();

/**
 * Zod schema for location ID URL parameter.
 */
const locationIdSchema = z.object({
  id: z.string({
    required_error: 'Location ID is required',
  }).uuid('Invalid Location ID format. Must be a valid UUID.'),
});

/**
 * Zod schema for reverse geocoding request body.
 */
const resolveCoordinatesSchema = z.object({
  latitude: z.number({
    required_error: 'Latitude is required',
    invalid_type_error: 'Latitude must be a number',
  }).min(-90, 'Latitude must be between -90 and 90')
    .max(90, 'Latitude must be between -90 and 90'),

  longitude: z.number({
    required_error: 'Longitude is required',
    invalid_type_error: 'Longitude must be a number',
  }).min(-180, 'Longitude must be between -180 and 180')
    .max(180, 'Longitude must be between -180 and 180'),
}).strict();

module.exports = {
  createLocationSchema,
  updateLocationSchema,
  locationIdSchema,
  resolveCoordinatesSchema,
};
