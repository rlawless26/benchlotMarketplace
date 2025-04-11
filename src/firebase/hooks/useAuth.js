import { useState, useEffect, useContext, createContext } from 'react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../config';

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
    
    const unsubscribe = onAuthStateChange();
    
    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  // Listen for Firebase auth state changes
  const onAuthStateChange = () => {
    return onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      try {
        if (user) {
          console.log("User signed in:", user.uid);
          
          const userRef = doc(db, 'users', user.uid);
          const userSnap = await getDoc(userRef);
          
          let userProfile = null;
          
          if (userSnap.exists()) {
            console.log("User profile found in Firestore");
            userProfile = userSnap.data();
          } else {
            console.log("No user profile found, creating...");
            // Create a basic profile
            userProfile = {
              uid: user.uid,
              email: user.email,
              displayName: user.displayName || user.email?.split('@')[0] || 'User',
              photoURL: user.photoURL || null,
              createdAt: new Date().toISOString(),
            };
            
            try {
              await setDoc(userRef, userProfile);
              console.log("Created new user profile");
            } catch (err) {
              console.error("Error creating user profile:", err);
            }
          }
          
          // Merge auth and profile data
          const userData = {
            uid: user.uid,
            email: user.email,
            emailVerified: user.emailVerified,
            displayName: user.displayName,
            photoURL: user.photoURL,
            profile: userProfile
          };
          
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
      await sendPasswordResetEmail(auth, email);
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