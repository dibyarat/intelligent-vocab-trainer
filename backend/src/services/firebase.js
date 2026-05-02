/**
 * Firebase Admin SDK Initialization
 * Handles Firestore database and FCM push notifications.
 * In DEMO_MODE, uses an in-memory mock for zero-config local testing.
 */

const DEMO_MODE = process.env.DEMO_MODE === 'true';

let db = null;
let messaging = null;
let initialized = false;

async function initFirebase() {
  if (initialized) return;

  if (DEMO_MODE) {
    // ── Demo Mode: Use in-memory mocks ──
    const { mockDb, mockMessaging } = require('./mockFirebase');
    db = mockDb;
    messaging = mockMessaging;
    console.log('[Firebase] Running in DEMO MODE (in-memory, no GCP credentials needed)');
    initialized = true;
    return;
  }

  // ── Production: Real Firebase Admin SDK ──
  const admin = require('firebase-admin');

  if (admin.apps.length > 0) {
    initialized = true;
    return;
  }

  const serviceAccount = {
    type: 'service_account',
    project_id: process.env.FIREBASE_PROJECT_ID,
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    private_key: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  };

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: process.env.FIREBASE_PROJECT_ID,
  });

  db = admin.firestore();
  messaging = admin.messaging();

  // Configure Firestore settings
  db.settings({ ignoreUndefinedProperties: true });
  initialized = true;
}

function getDb() {
  if (!db) throw new Error('Firestore not initialized. Call initFirebase() first.');
  return db;
}

function getMessaging() {
  if (!messaging) throw new Error('FCM Messaging not initialized.');
  return messaging;
}

module.exports = { initFirebase, getDb, getMessaging };
