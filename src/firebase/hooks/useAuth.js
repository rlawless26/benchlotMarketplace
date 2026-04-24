import { useState, useEffect, useRef, useContext, createContext } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail as firebaseSendPasswordResetEmail,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  GoogleAuthProvider,
  FacebookAuthProvider,
  OAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../config';
import posthog from 'posthog-js';

// Create context for authentication
const AuthContext = createContext();

// Provider component
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Holds the active onSnapshot unsubscribe so it can be torn down on auth
  // state changes (sign out, account swap) and provider unmount.
  const unsubscribeUserDocRef = useRef(null);

  // Set up auth state listener + per-user-doc snapshot listener.
  //
  // We use onSnapshot (not getDoc) so any update to users/{uid} — e.g.
  // createSellerAccount flipping isSeller, or the Stripe webhook setting
  // chargesEnabled — propagates into React state in real time. The previous
  // one-time getDoc left React state stale until the next page refresh.
  useEffect(() => {
    setLoading(true);

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      // Tear down any prior user-doc listener — we may be switching accounts.
      if (unsubscribeUserDocRef.current) {
        unsubscribeUserDocRef.current();
        unsubscribeUserDocRef.current = null;
      }

      if (!firebaseUser) {
        setUser(null);
        setProfile(null);
        posthog.reset();
        setLoading(false);
        return;
      }

      const userRef = doc(db, 'users', firebaseUser.uid);

      // First-time-user check: if the doc doesn't exist yet, create it. The
      // subsequent onSnapshot subscription will deliver the freshly-written
      // doc and populate React state.
      try {
        const initialSnap = await getDoc(userRef);
        if (!initialSnap.exists()) {
          const newProfile = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
            photoURL: firebaseUser.photoURL || null,
            createdAt: new Date().toISOString(),
            role: 'user',
            profile: {
              fullName: '',
              bio: '',
              location: '',
            },
          };
          try {
            await setDoc(userRef, newProfile, { merge: true });
          } catch (err) {
            console.error("Error creating user profile:", err);
          }
        }
      } catch (err) {
        console.error("Error checking for user profile:", err);
      }

      // Subscribe for real-time updates. Each delivery merges Firebase Auth
      // user fields with the Firestore user doc and updates React state.
      unsubscribeUserDocRef.current = onSnapshot(
        userRef,
        (snap) => {
          if (!snap.exists()) {
            // Edge case: doc was deleted while we were subscribed.
            setUser(null);
            setLoading(false);
            return;
          }

          const userProfile = snap.data();

          // Merge auth and Firestore data — Firestore is source of truth
          // for profile fields, Firebase Auth is source of truth for the
          // session identity (uid, email, emailVerified).
          const userData = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            emailVerified: firebaseUser.emailVerified,
            displayName: userProfile.displayName || firebaseUser.displayName,
            photoURL: userProfile.photoURL || firebaseUser.photoURL,
            role: userProfile.role,
            ...userProfile,
            profile: userProfile.profile || {},
          };

          setUser(userData);
          setLoading(false);

          // Re-identify with PostHog on every snapshot — keeps analytics in
          // sync with profile changes (becoming a seller, etc.).
          posthog.identify(userData.uid, {
            email: userData.email,
            name: userData.displayName,
            isSeller: userData.isSeller || userData.seller?.isSeller || false,
          });
        },
        (err) => {
          console.error("User doc snapshot error:", err);
          setError(err.message);
          setLoading(false);
        }
      );
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeUserDocRef.current) {
        unsubscribeUserDocRef.current();
        unsubscribeUserDocRef.current = null;
      }
    };
  }, []);

  // Sign in with email and password
  const signIn = async (email, password) => {
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      setError(null); // Clear any previous errors
      return { user: userCredential.user, error: null };
    } catch (err) {
      console.error("Sign in error:", err.message);
      // Still return error, but don't set it in the hook state
      // since we're handling it in the component
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
        role: 'user',
        ...userData
      };
      
      const userRef = doc(db, 'users', userCredential.user.uid);
      await setDoc(userRef, userProfile, { merge: true });

      // Welcome email is sent by the users/{uid} onCreate Cloud Function trigger
      // (Template 3: Welcome Full Account). No direct email call here.

      setError(null); // Clear any previous errors
      return { user: userCredential.user, error: null };
    } catch (err) {
      console.error("Sign up error:", err.message);
      // Still return error, but don't set it in the hook state
      return { user: null, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  // Sign out
  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      setError(null); // Clear any previous errors
      return { success: true };
    } catch (err) {
      console.error("Sign out error:", err.message);
      // Still return error, but don't set it in the hook state
      return { success: false, error: err.message };
    }
  };

  // Reset password — use Firebase Auth's built-in email (no Resend involvement).
  const resetPassword = async (email) => {
    try {
      await firebaseSendPasswordResetEmail(auth, email);
      setError(null);
      return { success: true };
    } catch (err) {
      console.error("Password reset error:", err.message);
      return { success: false, error: err.message };
    }
  };
  
  // Social Sign In with Google
  const signInWithGoogle = async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      
      // Check if this is a new user (first time sign-in with Google)
      const isNewUser = result._tokenResponse.isNewUser;
      
      if (isNewUser) {
        // Create a new user record in Firestore
        const userProfile = {
          uid: result.user.uid,
          email: result.user.email,
          displayName: result.user.displayName || result.user.email?.split('@')[0],
          photoURL: result.user.photoURL,
          createdAt: new Date().toISOString(),
          role: 'user',
          profile: {
            fullName: result.user.displayName || '',
            firstName: result.user.displayName?.split(' ')[0] || '',
            lastName: result.user.displayName?.split(' ').slice(1).join(' ') || '',
            bio: '',
            location: ''
          }
        };
        
        const userRef = doc(db, 'users', result.user.uid);
        await setDoc(userRef, userProfile);
        
        // Welcome email handled by users/{uid} onCreate Cloud Function trigger.
      }
      
      setError(null); // Clear any previous errors
      return { user: result.user, error: null };
    } catch (err) {
      console.error("Google sign in error:", err.message);
      // Don't set error in the hook state
      return { user: null, error: err.message };
    } finally {
      setLoading(false);
    }
  };
  
  // Social Sign In with Facebook
  const signInWithFacebook = async () => {
    setLoading(true);
    try {
      const provider = new FacebookAuthProvider();
      const result = await signInWithPopup(auth, provider);
      
      // Similar pattern as Google sign-in
      const isNewUser = result._tokenResponse.isNewUser;
      
      if (isNewUser) {
        // Create user profile in Firestore
        const userProfile = {
          uid: result.user.uid,
          email: result.user.email,
          displayName: result.user.displayName || result.user.email?.split('@')[0],
          photoURL: result.user.photoURL,
          createdAt: new Date().toISOString(),
          role: 'user',
          profile: {
            fullName: result.user.displayName || '',
            firstName: result.user.displayName?.split(' ')[0] || '',
            lastName: result.user.displayName?.split(' ').slice(1).join(' ') || '',
            bio: '',
            location: ''
          }
        };
        
        const userRef = doc(db, 'users', result.user.uid);
        await setDoc(userRef, userProfile);
        
        // Welcome email handled by users/{uid} onCreate Cloud Function trigger.
      }
      
      setError(null); // Clear any previous errors
      return { user: result.user, error: null };
    } catch (err) {
      console.error("Facebook sign in error:", err.message);
      // Don't set error in the hook state
      return { user: null, error: err.message };
    } finally {
      setLoading(false);
    }
  };
  
  // Social Sign In with Apple
  const signInWithApple = async () => {
    setLoading(true);
    try {
      const provider = new OAuthProvider('apple.com');
      provider.addScope('email');
      provider.addScope('name');
      
      const result = await signInWithPopup(auth, provider);
      
      // Similar pattern as other providers
      const isNewUser = result._tokenResponse.isNewUser;
      
      if (isNewUser) {
        // Create user profile in Firestore
        // Note: Apple may not provide displayName, so handle that case
        const userProfile = {
          uid: result.user.uid,
          email: result.user.email,
          displayName: result.user.displayName || result.user.email?.split('@')[0],
          photoURL: result.user.photoURL,
          createdAt: new Date().toISOString(),
          role: 'user',
          profile: {
            fullName: result.user.displayName || '',
            firstName: result.user.displayName?.split(' ')[0] || '',
            lastName: result.user.displayName?.split(' ').slice(1).join(' ') || '',
            bio: '',
            location: ''
          }
        };
        
        const userRef = doc(db, 'users', result.user.uid);
        await setDoc(userRef, userProfile);
        
        // Welcome email handled by users/{uid} onCreate Cloud Function trigger.
      }
      
      setError(null); // Clear any previous errors
      return { user: result.user, error: null };
    } catch (err) {
      console.error("Apple sign in error:", err.message);
      // Don't set error in the hook state
      return { user: null, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  // Helper method to check if user is authenticated
  const isAuthenticated = () => {
    return !!user;
  };

  // ---------------------------------------------------------------------------
  // Passwordless email-link sign-in (Firebase email link auth)
  // ---------------------------------------------------------------------------

  // Where Firebase sends the user back to after they click the email link.
  // Firebase appends its own apiKey / mode / oobCode params; App.js detects
  // them on mount via completeSignInFromLink().
  const EMAIL_LINK_RETURN_URL =
    typeof window !== 'undefined'
      ? `${window.location.origin}/?auth=email-link`
      : 'https://benchlot.com/?auth=email-link';

  const EMAIL_LINK_STORAGE_KEY = 'benchlot:emailForSignIn';

  /**
   * Send a one-time sign-in link to `email`. Stores the email in
   * localStorage so completeSignInFromLink() can recover it when the user
   * clicks back (Firebase requires the original email to complete the flow,
   * even in the same browser).
   */
  const sendSignInLink = async (email) => {
    try {
      const normalized = (email || '').trim().toLowerCase();
      if (!normalized) return { success: false, error: 'Email is required' };
      await sendSignInLinkToEmail(auth, normalized, {
        url: EMAIL_LINK_RETURN_URL,
        handleCodeInApp: true,
      });
      window.localStorage.setItem(EMAIL_LINK_STORAGE_KEY, normalized);
      return { success: true };
    } catch (err) {
      console.error('sendSignInLink error:', err.message);
      return { success: false, error: err.message };
    }
  };

  /**
   * If the current URL is a sign-in link, complete the flow. Call once on
   * app mount. Returns the sign-in result shape or `{ success: false,
   * reason: 'not-a-link' }` when the URL isn't one.
   */
  const completeSignInFromLink = async () => {
    try {
      if (typeof window === 'undefined') return { success: false, reason: 'ssr' };
      if (!isSignInWithEmailLink(auth, window.location.href)) {
        return { success: false, reason: 'not-a-link' };
      }
      let email = window.localStorage.getItem(EMAIL_LINK_STORAGE_KEY);
      if (!email) {
        // Cross-device flow: the user clicked the link on a different browser
        // than the one that sent it. Prompt for the email to confirm.
        email = window.prompt('Please confirm the email you used to sign in:');
      }
      if (!email) return { success: false, reason: 'no-email' };
      const result = await signInWithEmailLink(auth, email, window.location.href);
      window.localStorage.removeItem(EMAIL_LINK_STORAGE_KEY);

      // First-time sign-in via email link → seed a minimal user doc so
      // downstream features (alerts, profile) have a document to read.
      const isNewUser = result._tokenResponse?.isNewUser;
      if (isNewUser) {
        const userProfile = {
          uid: result.user.uid,
          email: result.user.email,
          displayName: result.user.email?.split('@')[0] || 'Member',
          createdAt: new Date().toISOString(),
          role: 'user',
          profile: {
            fullName: '',
            firstName: '',
            lastName: '',
            bio: '',
            location: '',
          },
        };
        const userRef = doc(db, 'users', result.user.uid);
        await setDoc(userRef, userProfile);
      }
      return { success: true, user: result.user, isNewUser };
    } catch (err) {
      console.error('completeSignInFromLink error:', err.message);
      return { success: false, error: err.message };
    }
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
    resetPassword,
    signInWithGoogle,
    signInWithFacebook,
    signInWithApple,
    sendSignInLink,
    completeSignInFromLink,
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