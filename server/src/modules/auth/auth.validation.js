const { z } = require('zod');

/**
 * Zod schema for login endpoint.
 * Validates that idToken is present and non-empty.
 */
const loginSchema = z.object({
  idToken: z.string({
    required_error: 'Firebase ID Token is required',
    invalid_type_error: 'Firebase ID Token must be a string',
  }).trim().min(1, 'Firebase ID Token cannot be empty'),
});

/**
 * Zod schema for updating profile.
 * Strictly checks that only fullName, preferredLanguage, and phoneNumber can be updated.
 * Any other field will cause a validation error.
 */
const updateProfileSchema = z.object({
  fullName: z.string()
    .trim()
    .min(1, 'Full name cannot be empty')
    .max(100, 'Full name is too long')
    .optional(),
  preferredLanguage: z.string()
    .trim()
    .min(2, 'Preferred language code must be at least 2 characters')
    .max(10, 'Preferred language code cannot exceed 10 characters')
    .optional(),
  phoneNumber: z.string()
    .trim()
    .min(5, 'Phone number is too short')
    .max(20, 'Phone number is too long')
    .optional(),
}).strict(); // Reject any unknown fields (like firebaseUid, email, provider)

module.exports = {
  loginSchema,
  updateProfileSchema,
};
