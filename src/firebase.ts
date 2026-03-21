import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';

// Import the Firebase configuration
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase SDK
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || '(default)');
export const auth = getAuth(app);

// Test connection
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Firestore connection successful.");
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('the client is offline') || error.message.includes('unavailable')) {
        console.error("Firestore is unavailable. Please check your FIREBASE_PROJECT_ID and FIREBASE_API_KEY in AI Studio Secrets. Also, ensure Firestore is enabled in your Firebase Console.");
      } else if (error.message.includes('permission-denied')) {
        console.error("Firestore permission denied. Please check your firestore.rules.");
      } else {
        console.error("Firestore connection error:", error.message);
      }
    }
  }
}
testConnection();
