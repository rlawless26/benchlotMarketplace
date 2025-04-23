import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../firebase/hooks/useAuth';
import { createConnectAccount } from '../utils/stripeService';
import { openAuthModal } from '../utils/featureFlags';

/**
 * Seller Signup Page
 * Allows users to sign up as a seller on the platform
 * Initiates the Stripe Connect onboarding process
 */
const SellerSignupPage = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    sellerName: '',
    sellerBio: '',
    location: 'Boston, MA',
    contactEmail: '',
    contactPhone: '',
    sellerType: 'individual'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [stripeUrl, setStripeUrl] = useState(null);

  // Check if user is logged in
  useEffect(() => {
    console.log('SellerSignupPage - Auth state:', { user, loading });
    
    // Don't redirect if still loading authentication state
    if (loading && !user) {
      console.log('SellerSignupPage - Still loading auth state, waiting...');
      return;
    }
    
    if (!user) {
      console.log('SellerSignupPage - No user, opening auth modal');
      openAuthModal('signin', '/seller/signup');
      return;
    }
    
    console.log('SellerSignupPage - User authenticated:', user.uid);
    
    // Pre-fill form with user data if available
    // If user has a displayName, try to split it into firstName and lastName
    let firstName = '';
    let lastName = '';
    
    if (user.profile?.firstName && user.profile?.lastName) {
      firstName = user.profile.firstName;
      lastName = user.profile.lastName;
    } else if (user.displayName) {
      const nameParts = user.displayName.split(' ');
      firstName = nameParts[0] || '';
      lastName = nameParts.slice(1).join(' ') || '';
    }
    
    setFormData(prev => ({
      ...prev,
      firstName,
      lastName,
      sellerName: user.profile?.displayName || user.displayName || '',
      contactEmail: user.email || '',
    }));
    setLoading(false);
  }, [user, navigate, loading]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    
    try {
      if (!user) {
        throw new Error('You must be logged in to become a seller');
      }
      
      // Create a Stripe Connect account
      const result = await createConnectAccount(
        { uid: user.uid, email: user.email },
        formData
      );
      
      // Save URL and immediately redirect to Stripe
      setStripeUrl(result.url);
      window.location.href = result.url;
    } catch (err) {
      console.error('Error setting up seller account:', err);
      setError(err.message || 'Failed to set up seller account. Please try again.');
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-100 min-h-screen">
        <main className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-700"></div>
            <span className="ml-2 text-gray-600">Loading...</span>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="bg-gray-100 min-h-screen">
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-medium text-gray-800 mb-6">Start Selling on Benchlot</h1>
          <p className="text-gray-600 mb-6">Complete your seller profile to begin listing tools.</p>
          
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            <div className="space-y-6">
              {/* First and Last Name Fields - Required for Stripe */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 font-medium mb-1" htmlFor="firstName">
                    First Name*
                  </label>
                  <input
                    type="text"
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-green-700"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-1" htmlFor="lastName">
                    Last Name*
                  </label>
                  <input
                    type="text"
                    id="lastName"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-green-700"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-gray-700 font-medium mb-1" htmlFor="sellerName">
                  Seller Name*
                </label>
                <input
                  type="text"
                  id="sellerName"
                  name="sellerName"
                  value={formData.sellerName}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-green-700"
                  required
                />
                <p className="text-sm text-gray-500 mt-1">This is how you'll appear to buyers</p>
              </div>
              
              <div>
                <label className="block text-gray-700 font-medium mb-1" htmlFor="sellerType">
                  Seller Type*
                </label>
                <select
                  id="sellerType"
                  name="sellerType"
                  value={formData.sellerType}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-green-700 bg-white"
                  required
                  style={{ height: '42px', appearance: 'none', backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23666666%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E"), linear-gradient(to bottom, #ffffff 0%, #f9f9f9 100%)' , backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.7rem top 50%, 0 0', backgroundSize: '0.65rem auto, 100%' }}
                >
                  <option value="individual">Individual</option>
                  <option value="business">Business</option>
                </select>
              </div>
              
              <div>
                <label className="block text-gray-700 font-medium mb-1" htmlFor="sellerBio">
                  About You
                </label>
                <textarea
                  id="sellerBio"
                  name="sellerBio"
                  value={formData.sellerBio}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-green-700"
                  rows="4"
                ></textarea>
                <p className="text-sm text-gray-500 mt-1">Tell buyers about yourself and your tools</p>
              </div>
              
              <div>
                <label className="block text-gray-700 font-medium mb-1" htmlFor="location">
                  Location*
                </label>
                <select
                  id="location"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-green-700 bg-white"
                  required
                  style={{ height: '42px', appearance: 'none', backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23666666%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E"), linear-gradient(to bottom, #ffffff 0%, #f9f9f9 100%)' , backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.7rem top 50%, 0 0', backgroundSize: '0.65rem auto, 100%' }}
                >
                  <option value="Boston, MA">Boston, MA</option>
                  <option value="Cambridge, MA">Cambridge, MA</option>
                  <option value="Somerville, MA">Somerville, MA</option>
                  <option value="Medford, MA">Medford, MA</option>
                  <option value="Brookline, MA">Brookline, MA</option>
                </select>
              </div>
              
              <div>
                <label className="block text-gray-700 font-medium mb-1" htmlFor="contactEmail">
                  Contact Email*
                </label>
                <input
                  type="email"
                  id="contactEmail"
                  name="contactEmail"
                  value={formData.contactEmail}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-green-700"
                  required
                />
              </div>
              
              <div>
                <label className="block text-gray-700 font-medium mb-1" htmlFor="contactPhone">
                  Contact Phone
                </label>
                <input
                  type="tel"
                  id="contactPhone"
                  name="contactPhone"
                  value={formData.contactPhone}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-green-700"
                />
                <p className="text-sm text-gray-500 mt-1">Optional, but helps with local pickup</p>
              </div>
              
              <div className="pt-4">
                <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-md mb-6">
                  <p className="font-medium">After submitting this form:</p>
                  <p className="mt-1 text-sm">You'll be directed to Stripe (our payment processor) to verify your identity and set up payments. This is required to receive payouts as a seller.</p>
                  <p className="mt-1 text-sm">Once complete, you'll be returned to Benchlot to start listing your tools.</p>
                </div>
              
                <button
                  type="submit"
                  className="w-full py-3 bg-green-700 text-white rounded-md hover:bg-green-800 font-medium"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Setting up...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center">
                      Start Selling
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-2" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </span>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default SellerSignupPage;