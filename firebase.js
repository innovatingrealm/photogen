/**
 * Firebase Admin SDK initialization for Node.js backend.
 * This module initializes Firebase Admin for uploading images to Firebase Storage.
 * 
 * NOTE: For production, use a service account key JSON file for secure access.
 * Here, we use environment variables/config as provided.
 */


require('dotenv').config();
const { initializeApp, cert } = require('firebase-admin/app');
const { getStorage } = require('firebase-admin/storage');

// Build service account object from environment variables
const serviceAccount = {
  type: process.env.FIREBASE_TYPE,
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: process.env.FIREBASE_AUTH_URI,
  token_uri: process.env.FIREBASE_TOKEN_URI,
  auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
  client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
  universe_domain: process.env.FIREBASE_UNIVERSE_DOMAIN,
};

const firebaseConfig = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: "ai-photo-1e8ba.firebasestorage.app", // Match bucket name in Firebase Console
};

// Initialize Firebase Admin SDK with credentials from .env
initializeApp({
  credential: cert(serviceAccount),
  ...firebaseConfig,
});

const storage = getStorage();

module.exports = { storage };
