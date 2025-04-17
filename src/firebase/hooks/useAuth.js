import { useState, useEffect, useContext, createContext } from 'react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail as firebaseSendPasswordResetEmail
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../config';
import * as emailService from '../../utils/emailService';

// Create context for authentication
const AuthContext = createContext();

// Provider component
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Set up auth state listener
  useEffect(() => {
    console.log("Setting up auth state listener");
    
    // Set loading to true when initializing
    setLoading(true);
    
    const unsubscribe = onAuthStateChange();
    
    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  // Listen for Firebase auth state changes
  const onAuthStateChange = () => {
    return onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      try {
        if (firebaseUser) {
          console.log("User signed in:", firebaseUser.uid);
          
          const userRef = doc(db, 'users', firebaseUser.uid);
          const userSnap = await getDoc(userRef);
          
          let userProfile = null;
          
          if (userSnap.exists()) {
            console.log("User profile found in Firestore");
            userProfile = userSnap.data();
          } else {
            console.log("No user profile found, creating...");
            // Create a basic profile with role field to satisfy security rules
            userProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
              photoURL: firebaseUser.photoURL || null,
              createdAt: new Date().toISOString(),
              // Add a default role field to satisfy security rules
              role: 'user',
              // Add a profile object for structured user data
              profile: {
                // Default empty values that will be populated through settings
                fullName: '',
                bio: '',
                location: ''
              }
            };
            
            try {
              await setDoc(userRef, userProfile);
              console.log("Created new user profile");
            } catch (err) {
              console.error("Error creating user profile:", err);
            }
          }
          
          // Merge auth and profile data - use the Firestore data as the source of truth
          const userData = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            emailVerified: firebaseUser.emailVerified,
            // Use Firestore values if available, fallback to auth values
            displayName: userProfile.displayName || firebaseUser.displayName,
            photoURL: userProfile.photoURL || firebaseUser.photoURL,
            // Include the role from Firestore
            role: userProfile.role,
            // Spread the actual Firestore document
            ...userProfile,
            // Make sure profile is included
            profile: userProfile.profile || {}
          };
          
          console.log('Merged user data:', JSON.stringify(userData, null, 2));
          
          setUser(userData);
        } else {
          console.log("User signed out or no user");
          setUser(null);
          setProfile(null);
        }
      } catch (err) {
        console.error("Auth state change error:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    });
  };

  // Sign in with email and password
  const signIn = async (email, password) => {
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return { user: userCredential.user, error: null };
    } catch (err) {
      console.error("Sign in error:", err.message);
      setError(err.message);
      return { user: null, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  // Sign up with email and password
  const signUp = async (email, password, userData = {}) => {
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Create user profile in Firestore
      const userProfile = {
        uid: userCredential.user.uid,
        email: userCredential.user.email,
        displayName: userData.displayName || email.split('@')[0],
        photoURL: userData.photoURL || null,
        createdAt: new Date().toISOString(),
        ...userData
      };
      
      const userRef = doc(db, 'users', userCredential.user.uid);
      await setDoc(userRef, userProfile);
      
      // Send welcome email
      try {
        console.log("Sending welcome email to new user:", email);
        await emailService.sendAccountCreationEmail(email, userProfile.displayName);
      } catch (emailError) {
        // Don't fail signup if email fails
        console.error("Error sending welcome email:", emailError);
      }
      
      return { user: userCredential.user, error: null };
    } catch (err) {
      console.error("Sign up error:", err.message);
      setError(err.message);
      return { user: null, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  // Sign out
  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      return { success: true };
    } catch (err) {
      console.error("Sign out error:", err.message);
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  // Reset password
  const resetPassword = async (email) => {
    try {
      // First, use Firebase's built-in password reset
      await firebaseSendPasswordResetEmail(auth, email);
      
      // Get the action code settings to extract the reset URL
      const actionCodeSettings = {
        url: `${window.location.origin}/login`,
        handleCodeInApp: false,
      };
      
      // Also send our customized email with more detailed instructions
      try {
        console.log("Sending custom password reset email:", email);
        const resetLink = `${window.location.origin}/reset-password?email=${encodeURIComponent(email)}`;
        await emailService.sendPasswordResetEmail(email, resetLink);
      } catch (emailError) {
        // Don't fail the password reset if our custom email fails
        console.error("Error sending custom password reset email:", emailError);
      }
      
      return { success: true };
    } catch (err) {
      console.error("Password reset error:", err.message);
      return { success: false, error: err.message };
    }
  };

  // Helper method to check if user is authenticated
  const isAuthenticated = () => {
    return !!user;
  };

  // Context value
  const value = {
    user,
    profile,
    loading,
    error,
    isAuthenticated,
    signIn,
    signUp,
    signOut,
    resetPassword
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Hook for using auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default useAuth;