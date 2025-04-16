/**
 * Firebase Services
 * 
 * This file centralizes all Firebase service initialization
 * and provides a consistent API for Firebase services.
 */

import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';
import { app } from '../config';

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

// Set region for functions if needed
// functions.useEmulator("localhost", 5001);

// Export service modules
export * from './auth';
export * from './firestore';
export * from './storage';