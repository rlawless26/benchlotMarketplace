import React, { useState } from 'react';
import { useAuth } from '../firebase';

/**
 * Simple Authentication Component
 * For testing Firebase authentication
 */
function AuthComponent() {
  const { user, loading, error, signIn, signUp, signOut, resetPassword } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authMode, setAuthMode] = useState('signin'); // 'signin', 'signup', 'reset'
  const [actionError, setActionError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  const handleEmailChange = (e) => setEmail(e.target.value);
  const handlePasswordChange = (e) => setPassword(e.target.value);
  
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
    }
  };
  
  const handleSignUp = async (e) => {
    e.preventDefault();
    setActionError(null);
    setActionSuccess(null);
    
    if (!email || !password) {
      setActionError('Email and password are required');
      return;
    }
    
    const { error } = await signUp(email, password);
    if (error) {
      setActionError(error);
    }
  };
  
  const handleSignOut = async () => {
    const { success, error } = await signOut();
    if (!success) {
      setActionError(error);
    }
  };
  
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
    } else {
      setActionError(error);
    }
  };

  if (loading) {
    return (
      <div className="section-container py-8">
        <div className="flex justify-center items-center p-8">
          <div className="animate-pulse flex flex-col items-center">
            <div className="w-12 h-12 border-4 border-benchlot-accent border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-benchlot-primary font-medium">Loading authentication...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="section-container py-8">
      <div className="bg-white rounded-lg shadow-card p-6">
        <h2 className="text-2xl font-bold text-benchlot-primary mb-6">Firebase Authentication</h2>
        
        {error && (
          <div className="alert-error mb-6">
            <p className="font-medium">Authentication Error:</p>
            <p>{error}</p>
          </div>
        )}
        
        {actionError && (
          <div className="alert-error mb-6">
            <p className="font-medium">Error:</p>
            <p>{actionError}</p>
          </div>
        )}
        
        {actionSuccess && (
          <div className="alert-success mb-6">
            <p>{actionSuccess}</p>
          </div>
        )}
        
        {user ? (
          <div className="bg-gray-50 rounded-lg p-6 mb-6">
            <h3 className="text-xl font-semibold text-benchlot-primary mb-4">Logged In User</h3>
            <div className="space-y-3 mb-6">
              <p className="flex flex-wrap">
                <span className="font-medium w-32">Email:</span> 
                <span>{user.email}</span>
              </p>
              <p className="flex flex-wrap">
                <span className="font-medium w-32">UID:</span> 
                <span className="font-mono text-sm">{user.uid}</span>
              </p>
              
              {user.profile && (
                <div className="space-y-3">
                  <p className="flex flex-wrap">
                    <span className="font-medium w-32">Display Name:</span> 
                    <span>{user.profile.displayName}</span>
                  </p>
                  {user.profile.photoURL && (
                    <div className="flex items-center mt-2">
                      <span className="font-medium w-32">Profile:</span> 
                      <img 
                        src={user.profile.photoURL} 
                        alt="Profile" 
                        className="w-12 h-12 rounded-full border-2 border-gray-200 object-cover" 
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
            <button 
              onClick={handleSignOut} 
              className="btn-secondary"
            >
              Sign Out
            </button>
          </div>
        ) : (
          <div className="mb-6">
            <div className="flex border-b border-gray-200 mb-6">
              <button 
                onClick={() => setAuthMode('signin')}
                className={`px-4 py-2 font-medium transition-colors duration-200 -mb-px ${
                  authMode === 'signin' 
                    ? 'text-benchlot-accent border-b-2 border-benchlot-accent' 
                    : 'text-gray-500 hover:text-benchlot-primary'
                }`}
              >
                Sign In
              </button>
              <button 
                onClick={() => setAuthMode('signup')}
                className={`px-4 py-2 font-medium transition-colors duration-200 -mb-px ${
                  authMode === 'signup' 
                    ? 'text-benchlot-accent border-b-2 border-benchlot-accent' 
                    : 'text-gray-500 hover:text-benchlot-primary'
                }`}
              >
                Sign Up
              </button>
              <button 
                onClick={() => setAuthMode('reset')}
                className={`px-4 py-2 font-medium transition-colors duration-200 -mb-px ${
                  authMode === 'reset' 
                    ? 'text-benchlot-accent border-b-2 border-benchlot-accent' 
                    : 'text-gray-500 hover:text-benchlot-primary'
                }`}
              >
                Reset Password
              </button>
            </div>
            
            {authMode === 'signin' && (
              <form onSubmit={handleSignIn} className="space-y-6">
                <h3 className="text-xl font-semibold text-benchlot-primary mb-4">Sign In</h3>
                <div className="form-group">
                  <label htmlFor="signin-email" className="form-label">Email</label>
                  <input
                    id="signin-email"
                    type="email"
                    value={email}
                    onChange={handleEmailChange}
                    placeholder="Enter your email"
                    className="form-input"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="signin-password" className="form-label">Password</label>
                  <input
                    id="signin-password"
                    type="password"
                    value={password}
                    onChange={handlePasswordChange}
                    placeholder="Enter your password"
                    className="form-input"
                    required
                  />
                </div>
                <button type="submit" className="btn-primary w-full">Sign In</button>
              </form>
            )}
            
            {authMode === 'signup' && (
              <form onSubmit={handleSignUp} className="space-y-6">
                <h3 className="text-xl font-semibold text-benchlot-primary mb-4">Sign Up</h3>
                <div className="form-group">
                  <label htmlFor="signup-email" className="form-label">Email</label>
                  <input
                    id="signup-email"
                    type="email"
                    value={email}
                    onChange={handleEmailChange}
                    placeholder="Enter your email"
                    className="form-input"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="signup-password" className="form-label">Password</label>
                  <input
                    id="signup-password"
                    type="password"
                    value={password}
                    onChange={handlePasswordChange}
                    placeholder="Create a password"
                    className="form-input"
                    required
                  />
                </div>
                <button type="submit" className="btn-primary w-full">Create Account</button>
              </form>
            )}
            
            {authMode === 'reset' && (
              <form onSubmit={handleResetPassword} className="space-y-6">
                <h3 className="text-xl font-semibold text-benchlot-primary mb-4">Reset Password</h3>
                <p className="text-gray-600 mb-4">Enter your email address and we'll send you a link to reset your password.</p>
                <div className="form-group">
                  <label htmlFor="reset-email" className="form-label">Email</label>
                  <input
                    id="reset-email"
                    type="email"
                    value={email}
                    onChange={handleEmailChange}
                    placeholder="Enter your email"
                    className="form-input"
                    required
                  />
                </div>
                <button type="submit" className="btn-accent w-full">Send Reset Email</button>
              </form>
            )}
          </div>
        )}
        
        <div className="mt-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-benchlot-primary mb-3">Authentication Debug</h3>
          <pre className="text-xs overflow-auto p-3 bg-gray-100 rounded border border-gray-300 max-h-60">
            {JSON.stringify({ user, loading, error }, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}

export default AuthComponent;