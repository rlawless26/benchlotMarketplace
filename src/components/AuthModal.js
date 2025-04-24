import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AuthForm from './AuthForm';
import { useAuth } from '../firebase';

/**
 * AuthModal Component
 * A reusable modal that displays authentication forms (sign in, sign up, reset password)
 */
const AuthModal = ({ 
  isOpen, 
  onClose, 
  initialMode = 'signin', // 'signin', 'signup', or 'reset'
  title,
  message
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const modalRef = useRef(null);

  // Handle modal visibility with animation
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'; // Prevent scrolling when modal is open
      setTimeout(() => setIsVisible(true), 10); // Slight delay for animation
    } else {
      setIsVisible(false);
      setTimeout(() => {
        document.body.style.overflow = ''; // Re-enable scrolling
      }, 300); // Match transition duration
    }
  }, [isOpen]);

  
  // Close modal when user is authenticated and handle redirects
  useEffect(() => {
    if (user && isOpen) {
      handleClose();
      
      // Handle redirect after successful authentication
      try {
        const redirectPath = sessionStorage.getItem('authRedirectPath');
        if (redirectPath) {
          // Clear the redirect path
          sessionStorage.removeItem('authRedirectPath');
          
          // Use window.location.href only for external URLs
          if (redirectPath.startsWith('http') && !redirectPath.includes(window.location.hostname)) {
            window.location.href = redirectPath;
          } else {
            // Use React Router's navigate for internal paths to avoid page refresh
            const cleanPath = redirectPath.replace(window.location.origin, '');
            
            // Small delay to ensure modal closes first
            setTimeout(() => {
              navigate(cleanPath);
            }, 100);
          }
        }
      } catch (error) {
        console.error('Error handling auth redirect:', error);
      }
    }
  }, [user, isOpen, navigate]);

  // Handle clicks outside modal to close
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === 'Escape') {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscKey);
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [isOpen]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      onClose();
    }, 300); // Wait for fade-out animation to complete
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center ${isVisible ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black bg-opacity-50" />
      
      {/* Modal */}
      <div 
        ref={modalRef}
        className={`bg-white rounded-lg max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto transform ${
          isVisible ? 'translate-y-0' : 'translate-y-8'
        } transition-transform duration-300`}
      >
        {/* Simplified header with only X button */}
        <div className="absolute top-4 right-4 z-10">
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        {/* Optional message */}
        {message && (
          <div className="p-4 pb-0 text-gray-600">
            <p>{message}</p>
          </div>
        )}
        
        {/* Auth Form */}
        <div className="px-5 pt-4 pb-5">
          <AuthForm isModal={true} onClose={handleClose} initialMode={initialMode} />
        </div>
      </div>
    </div>
  );
};

export default AuthModal;