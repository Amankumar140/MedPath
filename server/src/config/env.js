const { z } = require('zod');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '../../.env') });

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  API_PREFIX: z.string().default('/api/v1'),
  JWT_SECRET: z.string().default('dev_jwt_secret_value_for_local_testing_only'),
  SESSION_SECRET: z.string().default('dev_session_secret_value_for_local_testing_only'),
  DATABASE_URL: z.string().url().default('postgresql://postgres:postgres@localhost:5432/medpath?schema=public'),
  REDIS_URL: z.string().url().default('redis://localhost:6379'),
  FIREBASE_PROJECT_ID: z.string().default('medpath-firebase-project-id'),
  FIREBASE_CLIENT_EMAIL: z.string().email().default('firebase-adminsdk-xxxxx@medpath-firebase-project-id.iam.gserviceaccount.com'),
  FIREBASE_PRIVATE_KEY: z.string().default('-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n'),
  PYTHON_SERVICE_URL: z.string().url().default('http://localhost:8000'),
  FIREBASE_API_KEY: z.string().optional(),
  FIREBASE_AUTH_DOMAIN: z.string().optional(),
  FIREBASE_STORAGE_BUCKET: z.string().optional(),
  FIREBASE_MESSAGING_SENDER_ID: z.string().optional(),
  FIREBASE_APP_ID: z.string().optional(),
  FIREBASE_MEASUREMENT_ID: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(JSON.stringify(parsed.error.format(), null, 2));
  process.exit(1);
}

module.exports = parsed.data;
