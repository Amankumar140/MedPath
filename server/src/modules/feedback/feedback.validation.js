const { z } = require('zod');

// Reusable fields for review validations
const baseReviewShape = {
  conversationId: z.string({
    required_error: 'Conversation ID is required',
  }).uuid('Invalid Conversation ID format'),

  recommendationSnapshotId: z.string({
    required_error: 'Recommendation Snapshot ID is required',
  }).uuid('Invalid Recommendation Snapshot ID format'),

  hospitalName: z.string({
    required_error: 'Hospital Name is required',
  }).trim().min(1, 'Hospital Name cannot be empty'),

  visited: z.boolean().optional().nullable(),
  
  treatmentType: z.string().trim().optional().nullable(),
  estimatedCost: z.string().trim().optional().nullable(),
  
  actualCost: z.number({
    invalid_type_error: 'Actual cost must be a number',
  }).nonnegative('Actual cost cannot be negative').optional().nullable(),

  costAccuracy: z.enum(['Very Accurate', 'Accurate', 'Slightly Different', 'Very Different'], {
    invalid_enum_error: 'Invalid cost accuracy rating',
  }).optional().nullable(),

  doctorQuality: z.number().int().min(1).max(5).optional().nullable(),
  diagnosisExplanation: z.number().int().min(1).max(5).optional().nullable(),
  waitingTimeRating: z.number().int().min(1).max(5).optional().nullable(),
  facilityRating: z.number().int().min(1).max(5).optional().nullable(),
  staffRating: z.number().int().min(1).max(5).optional().nullable(),
  billingTransparency: z.number().int().min(1).max(5).optional().nullable(),

  hiddenCharges: z.enum(['None', 'Minor', 'Moderate', 'Significant'], {
    invalid_enum_error: 'Invalid hidden charges choice',
  }).optional().nullable(),

  specialtyMatch: z.number().int().min(1).max(5).optional().nullable(),
  medpathAccuracy: z.number().int().min(1).max(5).optional().nullable(),

  hospitalRecommendation: z.enum(['Definitely', 'Probably', 'Maybe', 'Probably Not', 'Never'], {
    invalid_enum_error: 'Invalid hospital recommendation choice',
  }).optional().nullable(),

  reviewText: z.string().trim().optional().nullable(),
  status: z.enum(['DRAFT', 'COMPLETED']).optional().default('DRAFT'),
};

// Apply conditional check for completed reviews
function validateCompletedReview(data, ctx) {
  if (data.status === 'COMPLETED') {
    // 1. Visited status is required
    if (data.visited === undefined || data.visited === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'You must answer if you visited the hospital',
        path: ['visited'],
      });
      return;
    }

    // 2. Visited: Yes Branch Validations
    if (data.visited === true) {
      if (!data.treatmentType || !data.treatmentType.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Treatment or consultation type is required',
          path: ['treatmentType'],
        });
      }

      if (data.actualCost === undefined || data.actualCost === null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Actual total cost is required',
          path: ['actualCost'],
        });
      }

      if (!data.costAccuracy) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'AI cost accuracy rating is required',
          path: ['costAccuracy'],
        });
      }

      if (data.doctorQuality === undefined || data.doctorQuality === null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Doctor's expertise rating is required",
          path: ['doctorQuality'],
        });
      }

      if (data.diagnosisExplanation === undefined || data.diagnosisExplanation === null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Diagnosis and treatment explanation rating is required',
          path: ['diagnosisExplanation'],
        });
      }

      if (data.waitingTimeRating === undefined || data.waitingTimeRating === null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Waiting time rating is required',
          path: ['waitingTimeRating'],
        });
      }

      if (data.facilityRating === undefined || data.facilityRating === null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Hospital facilities and cleanliness rating is required',
          path: ['facilityRating'],
        });
      }

      if (data.staffRating === undefined || data.staffRating === null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Hospital staff rating is required',
          path: ['staffRating'],
        });
      }

      if (data.billingTransparency === undefined || data.billingTransparency === null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Billing transparency rating is required',
          path: ['billingTransparency'],
        });
      }

      if (!data.hiddenCharges) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Hidden charges rating is required',
          path: ['hiddenCharges'],
        });
      }
    }

    // 3. Common requirements for both Visited: Yes / No
    if (data.specialtyMatch === undefined || data.specialtyMatch === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Specialty match suitability rating is required',
        path: ['specialtyMatch'],
      });
    }

    if (data.medpathAccuracy === undefined || data.medpathAccuracy === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'MedPath recommendation accuracy rating is required',
        path: ['medpathAccuracy'],
      });
    }

    if (!data.hospitalRecommendation) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Hospital recommendation rating is required',
        path: ['hospitalRecommendation'],
      });
    }
  }
}

const createReviewSchema = z.object(baseReviewShape).superRefine(validateCompletedReview);

// For updates, we make core fields optional but run the same validation on completion
const updateReviewShape = {
  ...baseReviewShape,
  conversationId: baseReviewShape.conversationId.optional(),
  recommendationSnapshotId: baseReviewShape.recommendationSnapshotId.optional(),
  hospitalName: baseReviewShape.hospitalName.optional(),
};

const updateReviewSchema = z.object(updateReviewShape).superRefine(validateCompletedReview);

const reviewIdSchema = z.object({
  id: z.string({
    required_error: 'Review ID is required',
  }).uuid('Invalid Review ID format. Must be a valid UUID.'),
});

const conversationIdSchema = z.object({
  conversationId: z.string({
    required_error: 'Conversation ID is required',
  }).uuid('Invalid Conversation ID format. Must be a valid UUID.'),
});

module.exports = {
  createReviewSchema,
  updateReviewSchema,
  reviewIdSchema,
  conversationIdSchema,
};
