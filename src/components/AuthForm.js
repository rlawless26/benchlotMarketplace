import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../firebase';
import { 
  Mail, 
  Lock, 
  User, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle
} from 'lucide-react';

/**
 * Enhanced Auth Form Component
 * Supports sign in, sign up, and password reset with social authentication
 */
const AuthForm = ({ isModal = false, onClose, initialMode }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { 
    user, 
    loading, 
    error, 
    signIn, 
    signUp, 
    signOut, 
    resetPassword,
    signInWithGoogle,
    signInWithFacebook
  } = useAuth();
  
  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [authMode, setAuthMode] = useState(initialMode || 'signin'); // 'signin', 'signup', 'reset'
  const [actionError, setActionError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);
  const [passwordConfirm, setPasswordConfirm] = useState('');

  // Handle URL parameters
  useEffect(() => {
    // Use initialMode if provided (for modal)
    if (initialMode) {
      setAuthMode(initialMode);
      return;
    }
    
    // Otherwise check URL params (for page)
    const signupParam = searchParams.get('signup');
    if (signupParam === 'true') {
      setAuthMode('signup');
    }
    
    const resetParam = searchParams.get('reset');
    if (resetParam === 'true') {
      setAuthMode('reset');
    }
  }, [searchParams, initialMode]);

  // Form field handlers
  const handleEmailChange = (e) => setEmail(e.target.value);
  const handlePasswordChange = (e) => setPassword(e.target.value);
  const handleFirstNameChange = (e) => setFirstName(e.target.value);
  const handleLastNameChange = (e) => setLastName(e.target.value);
  const handlePasswordConfirmChange = (e) => setPasswordConfirm(e.target.value);
  
  // Sign in with email/password
  const handleSignIn = async (e) => {
    e.preventDefault();
    setActionError(null);
    setActionSuccess(null);
    
    if (!email || !password) {
      setActionError('Email and password are required');
      return;
    }
    
    const { error } = await signIn(email, password);
    if (error) {
      setActionError(error);
    } else {
      setActionSuccess('Login successful!');
      if (isModal && onClose) {
        // Wait 2 seconds before closing the modal
        setTimeout(() => {
          onClose();
        }, 2000);
      }
    }
  };
  
  // Sign up with email/password
  const handleSignUp = async (e) => {
    e.preventDefault();
    setActionError(null);
    setActionSuccess(null);
    
    // Validate input
    if (!email || !password) {
      setActionError('Email and password are required');
      return;
    }
    
    if (password !== passwordConfirm) {
      setActionError('Passwords do not match');
      return;
    }
    
    if (password.length < 8) {
      setActionError('Password must be at least 8 characters');
      return;
    }
    
    // Prepare user data including profile information
    const userData = {
      displayName: `${firstName} ${lastName}`.trim(),
      profile: {
        fullName: `${firstName} ${lastName}`.trim(),
        firstName,
        lastName
      }
    };
    
    const { error } = await signUp(email, password, userData);
    if (error) {
      setActionError(error);
    } else {
      setActionSuccess('Account created successfully!');
      if (isModal && onClose) {
        // Wait 2 seconds before closing the modal
        setTimeout(() => {
          onClose();
        }, 2000);
      }
    }
  };
  
  // Sign out
  const handleSignOut = async () => {
    const { success, error } = await signOut();
    if (!success) {
      setActionError(error);
    }
  };
  
  // Reset password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setActionError(null);
    setActionSuccess(null);
    
    if (!email) {
      setActionError('Email is required');
      return;
    }
    
    const { success, error } = await resetPassword(email);
    if (success) {
      setActionSuccess('Password reset email sent. Check your inbox.');
      if (isModal && onClose) {
        // Wait 2 seconds before closing the modal
        setTimeout(() => {
          onClose();
        }, 2000);
      }
    } else {
      setActionError(error);
    }
  };

  // Social sign-in handlers
  const handleGoogleSignIn = async (e) => {
    e.preventDefault();
    setActionError(null);
    setActionSuccess(null);
    
    try {
      const { user, error } = await signInWithGoogle();
      if (error) {
        setActionError(error);
      } else {
        setActionSuccess('Google login successful!');
        if (isModal && onClose) {
          // Wait 2 seconds before closing the modal
          setTimeout(() => {
            onClose();
          }, 2000);
        }
      }
    } catch (error) {
      console.error("Google sign-in error:", error);
      setActionError(error.message || "Failed to sign in with Google");
    }
  };

  const handleFacebookSignIn = async (e) => {
    e.preventDefault();
    setActionError(null);
    setActionSuccess(null);
    
    try {
      const { user, error } = await signInWithFacebook();
      if (error) {
        setActionError(error);
      } else {
        setActionSuccess('Facebook login successful!');
        if (isModal && onClose) {
          // Wait 2 seconds before closing the modal
          setTimeout(() => {
            onClose();
          }, 2000);
        }
      }
    } catch (error) {
      console.error("Facebook sign-in error:", error);
      setActionError(error.message || "Failed to sign in with Facebook");
    }
  };


  // Loading state
  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-benchlot-accent border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-benchlot-primary font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  // Container classes
  const containerClasses = isModal 
    ? "form-container p-6" 
    : "form-container bg-white rounded-lg shadow-md p-6 my-8";

  return (
    <div className={containerClasses}>
      {error && (
        <div className="alert-error mb-6">
          <p className="font-medium">Authentication Error:</p>
          <p>{error}</p>
        </div>
      )}
      
      {actionError && (
        <div className="bg-red-50 border border-red-200 rounded-md px-4 py-3 mb-6 flex items-start">
          <AlertCircle className="text-red-500 h-5 w-5 mt-0.5 mr-2 flex-shrink-0" />
          <p className="text-red-700 text-sm">{actionError}</p>
        </div>
      )}
      
      {actionSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-md px-4 py-3 mb-6 flex items-center">
          <CheckCircle className="text-green-500 h-6 w-6 mr-3 flex-shrink-0" />
          <div>
            <p className="text-green-700 font-medium">{actionSuccess}</p>
          </div>
        </div>
      )}
      
      {/* Already logged in view */}
      {user ? (
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-xl font-semibold text-benchlot-primary mb-4">Welcome Back</h3>
          <div className="space-y-2 mb-6">
            <p className="flex">
              <span className="font-medium w-32">Name:</span> 
              <span>{user.displayName || 'Not set'}</span>
            </p>
            <p className="flex">
              <span className="font-medium w-32">Email:</span> 
              <span>{user.email}</span>
            </p>
          </div>
          <button 
            onClick={handleSignOut} 
            className="btn-secondary"
          >
            Sign Out
          </button>
        </div>
      ) : (
        <div>
          {/* Tabs - Top row with no top margin */}
          <div className="flex border-b-0 mb-0 -mt-1 mr-8">
            <button 
              onClick={() => setAuthMode('signin')}
              className={`px-4 py-2 font-medium transition-colors duration-200 ${
                authMode === 'signin' 
                  ? 'text-benchlot-accent border-b-2 border-benchlot-accent' 
                  : 'text-gray-500 hover:text-benchlot-primary'
              }`}
            >
              Login
            </button>
            <button 
              onClick={() => setAuthMode('signup')}
              className={`px-4 py-2 font-medium transition-colors duration-200 ${
                authMode === 'signup' 
                  ? 'text-benchlot-accent border-b-2 border-benchlot-accent' 
                  : 'text-gray-500 hover:text-benchlot-primary'
              }`}
            >
              Sign Up
            </button>
          </div>
          
          {/* Divider below tabs */}
          <div className="border-b border-gray-200 mb-5 mt-1"></div>
          
          {/* Sign In Form */}
          {authMode === 'signin' && (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-benchlot-primary mb-5">Log in to your Benchlot account</h3>
              <form onSubmit={handleSignIn} className="space-y-5">
                <div className="form-group">
                  <label htmlFor="email" className="form-label">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={handleEmailChange}
                    className="form-input"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="password" className="form-label">
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={handlePasswordChange}
                    className="form-input"
                    required
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <input
                      id="remember-me"
                      name="remember-me"
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-benchlot-primary focus:ring-benchlot-primary"
                    />
                    <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                      Remember me
                    </label>
                  </div>

                  <button 
                    type="button" 
                    onClick={() => setAuthMode('reset')}
                    className="text-sm font-medium text-benchlot-primary hover:text-benchlot-secondary"
                  >
                    Forgot password?
                  </button>
                </div>
                <button type="submit" className="w-full px-6 py-3 bg-[#17613F] text-white font-semibold hover:bg-[#17613F]/90 transition-colors flex items-center justify-center gap-2 rounded-md">
                  <span>Login</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </form>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-gray-500">OR</span>
                </div>
              </div>
              
              {/* Social Sign In Buttons */}
              <div className="space-y-3">
                <button 
                  onClick={handleGoogleSignIn}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" className="mr-1">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  <span>Continue with Google</span>
                </button>
                
                <button 
                  onClick={handleFacebookSignIn}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" className="mr-1">
                    <path fill="#1877F2" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                  <span>Continue with Facebook</span>
                </button>
                
              </div>
              
              <p className="text-center text-sm text-gray-600 mt-6">
                Don't have an account?{' '}
                <button
                  onClick={() => setAuthMode('signup')}
                  className="font-medium text-benchlot-primary hover:text-benchlot-secondary"
                >
                  Sign up now
                </button>
              </p>
            </div>
          )}
          
          {/* Sign Up Form */}
          {authMode === 'signup' && (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-benchlot-primary mb-5">Create a free Benchlot account</h3>
              <form onSubmit={handleSignUp} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="form-group">
                    <label htmlFor="firstName" className="form-label">
                      First Name
                    </label>
                    <input
                      id="firstName"
                      type="text"
                      value={firstName}
                      onChange={handleFirstNameChange}
                      className="form-input"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="lastName" className="form-label">
                      Last Name
                    </label>
                    <input
                      id="lastName"
                      type="text"
                      value={lastName}
                      onChange={handleLastNameChange}
                      className="form-input"
                      required
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="signup-email" className="form-label">
                    Email
                  </label>
                  <input
                    id="signup-email"
                    type="email"
                    value={email}
                    onChange={handleEmailChange}
                    className="form-input"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="signup-password" className="form-label">
                    Password
                  </label>
                  <input
                    id="signup-password"
                    type="password"
                    value={password}
                    onChange={handlePasswordChange}
                    className="form-input"
                    required
                    minLength="8"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="password-confirm" className="form-label">
                    Confirm Password
                  </label>
                  <input
                    id="password-confirm"
                    type="password"
                    value={passwordConfirm}
                    onChange={handlePasswordConfirmChange}
                    className="form-input"
                    required
                  />
                </div>
                <div className="form-group">
                  <div className="flex items-start">
                    <input
                      id="terms"
                      name="terms"
                      type="checkbox"
                      className="h-4 w-4 mt-1 rounded border-gray-300 text-benchlot-primary focus:ring-benchlot-primary"
                      required
                    />
                    <label htmlFor="terms" className="ml-2 block text-sm text-gray-700">
                      I agree to the{' '}
                      <a href="/terms" className="text-benchlot-primary hover:text-benchlot-secondary">
                        Terms of Service
                      </a>{' '}
                      and{' '}
                      <a href="/privacy" className="text-benchlot-primary hover:text-benchlot-secondary">
                        Privacy Policy
                      </a>
                    </label>
                  </div>
                </div>
                
                <button type="submit" className="w-full px-6 py-3 bg-[#17613F] text-white font-semibold hover:bg-[#17613F]/90 transition-colors flex items-center justify-center gap-2 rounded-md">
                  <span>Create Account</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </form>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-gray-500">OR</span>
                </div>
              </div>
              
              {/* Social Sign Up Buttons */}
              <div className="space-y-3">
                <button 
                  onClick={handleGoogleSignIn}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" className="mr-1">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  <span>Sign up with Google</span>
                </button>
                
                <button 
                  onClick={handleFacebookSignIn}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" className="mr-1">
                    <path fill="#1877F2" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                  <span>Sign up with Facebook</span>
                </button>
                
              </div>
              
              <p className="text-center text-sm text-gray-600 mt-6">
                Already have an account?{' '}
                <button
                  onClick={() => setAuthMode('signin')}
                  className="font-medium text-benchlot-primary hover:text-benchlot-secondary"
                >
                  Login instead
                </button>
              </p>
            </div>
          )}
          
          {/* Reset Password Form */}
          {authMode === 'reset' && (
            <form onSubmit={handleResetPassword} className="space-y-6">
              <h3 className="text-xl font-semibold text-benchlot-primary mb-5">Reset your password</h3>
              <p className="text-gray-600 mb-4">Enter your email address and we'll send you a link to reset your password.</p>
              <div className="form-group">
                <label htmlFor="reset-email" className="form-label">
                  Email
                </label>
                <input
                  id="reset-email"
                  type="email"
                  value={email}
                  onChange={handleEmailChange}
                  className="form-input"
                  required
                />
              </div>
              <button type="submit" className="w-full px-6 py-3 bg-[#17613F] text-white font-semibold hover:bg-[#17613F]/90 transition-colors flex items-center justify-center gap-2 rounded-md">
                <span>Send Reset Link</span>
                <ArrowRight className="h-4 w-4" />
              </button>
              
              <p className="text-center text-sm text-gray-600 mt-6">
                Remember your password?{' '}
                <button
                  onClick={() => setAuthMode('signin')}
                  className="font-medium text-benchlot-primary hover:text-benchlot-secondary"
                >
                  Back to login
                </button>
              </p>
            </form>
          )}
        </div>
      )}
    </div>
  );
};

export default AuthForm;