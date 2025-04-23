import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectStorageEmulator, getStorage } from 'firebase/storage';
import { connectFunctionsEmulator, getFunctions } from 'firebase/functions';

/**
 * Connects to Firebase emulators if in development mode
 * Call this function right after initializing Firebase
 */
export const connectToEmulators = (app) => {
  if (process.env.REACT_APP_USE_EMULATORS === 'true') {
    try {
      // Connect to Auth emulator
      const auth = getAuth(app);
      connectAuthEmulator(auth, process.env.REACT_APP_FIREBASE_AUTH_EMULATOR_URL);
      console.log('Connected to Auth emulator');
      
      // Connect to Firestore emulator
      const firestore = getFirestore(app);
      connectFirestoreEmulator(
        firestore, 
        'localhost', 
        8080
      );
      console.log('Connected to Firestore emulator');
      
      // Connect to Storage emulator
      const storage = getStorage(app);
      connectStorageEmulator(storage, 'localhost', 9199);
      console.log('Connected to Storage emulator');
      
      // Connect to Functions emulator
      const functions = getFunctions(app);
      connectFunctionsEmulator(functions, 'localhost', 5001);
      console.log('Connected to Functions emulator');
      
      console.log('All emulators connected successfully!');
    } catch (error) {
      console.error('Error connecting to emulators:', error);
    }
  }
};

export default connectToEmulators;