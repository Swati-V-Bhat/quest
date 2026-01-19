import * as admin from 'firebase-admin';

const SERVICE_ACCOUNT_KEY_BASE64 = process.env.FIREBASE_SERVICE_ACCOUNT_K;

// 1. Handle missing Service Account Key (prevent crash, just warn)
if (!SERVICE_ACCOUNT_KEY_BASE64) {
  console.error("❌ ERROR: FIREBASE_SERVICE_ACCOUNT_K is missing.");
}

// 2. Initialize App (Singleton Pattern)
if (!admin.apps.length) {
  try {
    if (SERVICE_ACCOUNT_KEY_BASE64) {
      const serviceAccount = JSON.parse(
        Buffer.from(SERVICE_ACCOUNT_KEY_BASE64, 'base64').toString('utf-8')
      );

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        // We intentionally DO NOT set storageBucket here to avoid the "undefined" crash.
        // We set it explicitly below.
      });
    }
  } catch (e: any) {
    console.error('Firebase admin initialization error!', e.message);
    // We don't throw here to allow the build to finish generating static pages
    // even if the credentials are wrong.
  }
}

const db = admin.firestore();

// 3. Initialize Storage with a HARDCODED FALLBACK
// This ensures the build NEVER crashes on "Bucket name not specified"
const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'onquest-bdc27.firebasestorage.app';

// We pass the bucket name explicitly here.
// If the env var is missing, it uses your hardcoded string.
const storage = admin.storage().bucket(bucketName);

export { db, storage, admin };
