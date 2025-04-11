import React, { useState } from 'react';
import { useAuth } from '../firebase';

/**
 * Basic Auth Form Component
 * For demonstrating Firebase authentication
 */
const AuthForm = () => {
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
    } else {
      setActionSuccess('Account created successfully!');
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
    return <div className="auth-loading">Loading...</div>;
  }

  return (
    <div className="auth-form-container">
      {error && (
        <div className="auth-error">
          Authentication Error: {error}
        </div>
      )}
      
      {actionError && (
        <div className="auth-error">
          Error: {actionError}
        </div>
      )}
      
      {actionSuccess && (
        <div className="auth-success">
          {actionSuccess}
        </div>
      )}
      
      {user ? (
        <div className="auth-user">
          <h3>Logged In User</h3>
          <p><strong>Email:</strong> {user.email}</p>
          <p><strong>UID:</strong> {user.uid}</p>
          
          {user.profile && (
            <div>
              <p><strong>Display Name:</strong> {user.profile.displayName}</p>
            </div>
          )}
          <button onClick={handleSignOut} className="sign-out-button">Sign Out</button>
        </div>
      ) : (
        <div className="auth-forms">
          <div className="auth-mode-selector">
            <button 
              onClick={() => setAuthMode('signin')}
              className={authMode === 'signin' ? 'auth-tab active' : 'auth-tab'}
            >
              Sign In
            </button>
            <button 
              onClick={() => setAuthMode('signup')}
              className={authMode === 'signup' ? 'auth-tab active' : 'auth-tab'}
            >
              Sign Up
            </button>
            <button 
              onClick={() => setAuthMode('reset')}
              className={authMode === 'reset' ? 'auth-tab active' : 'auth-tab'}
            >
              Reset Password
            </button>
          </div>
          
          {authMode === 'signin' && (
            <form onSubmit={handleSignIn} className="auth-form">
              <h3>Sign In</h3>
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={handleEmailChange}
                  placeholder="Email"
                />
              </div>
              <div className="form-group">
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={handlePasswordChange}
                  placeholder="Password"
                />
              </div>
              <button type="submit" className="submit-button">Sign In</button>
            </form>
          )}
          
          {authMode === 'signup' && (
            <form onSubmit={handleSignUp} className="auth-form">
              <h3>Sign Up</h3>
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={handleEmailChange}
                  placeholder="Email"
                />
              </div>
              <div className="form-group">
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={handlePasswordChange}
                  placeholder="Password"
                />
              </div>
              <button type="submit" className="submit-button">Sign Up</button>
            </form>
          )}
          
          {authMode === 'reset' && (
            <form onSubmit={handleResetPassword} className="auth-form">
              <h3>Reset Password</h3>
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={handleEmailChange}
                  placeholder="Email"
                />
              </div>
              <button type="submit" className="submit-button">Send Reset Email</button>
            </form>
          )}
        </div>
      )}
    </div>
  );
};

export default AuthForm;