const { getApps, initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

// Ensure variables are loaded in case this file is required before server.js loads them
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const serviceAccount = {
  type: 'service_account',
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY
    ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n').replace(/"/g, '')
    : undefined,
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: 'https://accounts.google.com/o/oauth2/auth',
  token_uri: 'https://oauth2.googleapis.com/token',
  auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
  client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
  universe_domain: 'googleapis.com'
};

let auth = null;
let initializationError = null;
const requiredFields = ['project_id', 'private_key', 'client_email'];
const missingFields = requiredFields.filter((field) => !serviceAccount[field]);

try {
  if (missingFields.length) {
    throw new Error(`Missing Firebase Admin credentials: ${missingFields.join(', ')}`);
  }
  if (!serviceAccount.private_key.includes('-----BEGIN PRIVATE KEY-----') ||
      !serviceAccount.client_email.includes('@')) {
    throw new Error('Firebase Admin credentials are malformed');
  }

  const app = getApps().find((existingApp) => existingApp.name === '[DEFAULT]') ||
    initializeApp({ credential: cert(serviceAccount) });
  auth = getAuth(app);
} catch (error) {
  initializationError = error;
  console.error('Firebase Admin initialization failed:', error.message);
}

module.exports = { auth, initializationError };
