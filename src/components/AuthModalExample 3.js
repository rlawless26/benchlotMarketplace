import React, { useState } from 'react';
import AuthModal from './AuthModal';

/**
 * Example component to demonstrate AuthModal usage
 */
const AuthModalExample = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState('signin');

  const openSignIn = () => {
    setAuthMode('signin');
    setIsModalOpen(true);
  };

  const openSignUp = () => {
    setAuthMode('signup');
    setIsModalOpen(true);
  };

  const openReset = () => {
    setAuthMode('reset');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  return (
    <div className="p-8 max-w-lg mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-center">Auth Modal Examples</h2>
      
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={openSignIn}
            className="px-4 py-2 bg-benchlot-primary text-white rounded-md hover:bg-benchlot-secondary transition-colors"
          >
            Open Sign In Modal
          </button>
          
          <button
            onClick={openSignUp}
            className="px-4 py-2 bg-benchlot-accent text-benchlot-primary rounded-md hover:bg-benchlot-accent-light transition-colors"
          >
            Open Sign Up Modal
          </button>
          
          <button
            onClick={openReset}
            className="px-4 py-2 border border-benchlot-primary text-benchlot-primary rounded-md hover:bg-gray-50 transition-colors"
          >
            Open Reset Password Modal
          </button>
        </div>
        
        <div className="mt-8 bg-gray-50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold mb-4">Usage Instructions</h3>
          <p className="mb-4">
            Import and use the AuthModal component anywhere in your application. Simply control its visibility 
            with state and provide an initial mode.
          </p>
          
          <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-sm">
{`import AuthModal from './components/AuthModal';

// In your component:
const [isModalOpen, setIsModalOpen] = useState(false);

// Open the modal
const openSignUp = () => {
  setIsModalOpen(true);
};

// Close the modal
const handleClose = () => {
  setIsModalOpen(false);
};

return (
  <>
    <button onClick={openSignUp}>Sign Up</button>
    
    <AuthModal 
      isOpen={isModalOpen}
      onClose={handleClose}
      initialMode="signup"
      title="Create Your Account"
      message="Join thousands of tool enthusiasts today!"
    />
  </>
);`}
          </pre>
        </div>
      </div>
      
      {/* Auth Modal */}
      <AuthModal
        isOpen={isModalOpen}
        onClose={closeModal}
        initialMode={authMode}
        title={
          authMode === 'signin' ? 'Sign In to Your Account' :
          authMode === 'signup' ? 'Create Your Account' :
          'Reset Your Password'
        }
        message={
          authMode === 'signin' ? 'Welcome back! Sign in to continue.' :
          authMode === 'signup' ? 'Join the Benchlot community today.' :
          'Enter your email to receive password reset instructions.'
        }
      />
    </div>
  );
};

export default AuthModalExample;