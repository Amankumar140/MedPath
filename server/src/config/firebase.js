const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');
const logger = require('./logger');
const env = require('./env');

let firebaseAdmin = null;

try {
  // Check if firebase.json exists in the server root directory
  const serviceAccountPath = path.join(__dirname, '../../firebase.json');
  
  if (fs.existsSync(serviceAccountPath)) {
    firebaseAdmin = admin.initializeApp({
      credential: admin.credential.cert(serviceAccountPath),
    });
    logger.info('🔥 Firebase Admin SDK initialized successfully using server/firebase.json file');
  } else {
    const privateKey = env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
    
    // Basic validation check to verify we aren't using the literal placeholder string from .env.example
    const hasValidCreds = 
      env.FIREBASE_PROJECT_ID !== 'medpath-firebase-project-id' &&
      env.FIREBASE_CLIENT_EMAIL !== 'firebase-adminsdk-xxxxx@medpath-firebase-project-id.iam.gserviceaccount.com';

    if (hasValidCreds) {
      firebaseAdmin = admin.initializeApp({
        credential: admin.credential.cert({
          projectId: env.FIREBASE_PROJECT_ID,
          clientEmail: env.FIREBASE_CLIENT_EMAIL,
          privateKey: privateKey,
        }),
      });
      logger.info('🔥 Firebase Admin SDK initialized successfully via environment variables');
    } else {
      logger.warn('⚠️ Firebase Admin SDK: Dummy or default credentials detected. Authentication services will not function properly.');
      // Initialize anyway (which might fail on actual api calls, but won't crash process now)
      firebaseAdmin = admin.initializeApp({
        credential: admin.credential.cert({
          projectId: 'dummy-project',
          clientEmail: 'dummy-email@dummy.com',
          privateKey: '-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC\n-----END PRIVATE KEY-----',
        }),
      });
    }
  }
} catch (error) {
  logger.error('❌ Failed to initialize Firebase Admin SDK:', error);
}

module.exports = firebaseAdmin;
