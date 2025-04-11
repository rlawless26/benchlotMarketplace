/**
 * Firebase configuration for Benchlot
 * Initializes and exports Firebase services
 */
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';
import { getAnalytics, isSupported } from 'firebase/analytics';

// Firebase configuration
// Using environment variables with fallback values for development
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSyAzzPSBiOb-vPqNtaEYQfq2FgTHI1uydJ4",
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "benchlot-6d64e.firebaseapp.com",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "benchlot-6d64e",
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "benchlot-6d64e.firebasestorage.app",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "261795762325",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:261795762325:web:088e8fbcfaa2f8c6530b9c",
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID || "G-EDNXNY6RYM"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const functions = getFunctions(app);

// Initialize analytics conditionally (only in browser environment)
let analytics = null;
isSupported().then(supported => {
  if (supported) {
    analytics = getAnalytics(app);
  }
}).catch(error => {
  console.error('Analytics initialization error:', error);
});

// Export initialized services
export { app, auth, db, storage, functions, analytics };