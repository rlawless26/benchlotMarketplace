import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Check, AlertTriangle } from 'lucide-react';
import { useAuth } from '../firebase/hooks/useAuth';
import { addBankAccount } from '../utils/stripeService';
import { db } from '../firebase';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { openAuthModal } from '../utils/featureFlags';

/**
 * BankDetailsPage Component
 * 
 * A dedicated form for collecting bank account details directly on our platform
 * for individual sellers using Custom Stripe Connect accounts.
 * 
 * This avoids having sellers go through Stripe's hosted onboarding process,
 * which asks for excessive information for individual sellers.
 */
const BankDetailsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  
  // Get accountId from URL params
  const searchParams = new URLSearchParams(location.search);
  const accountId = searchParams.get('accountId');
  
  // Form state
  const [formData, setFormData] = useState({
    accountNumber: '',
    routingNumber: '',
    accountHolderName: '',
    confirmAccountNumber: ''
  });
  
  // Validation state
  const [validation, setValidation] = useState({
    accountNumber: true,
    routingNumber: true,
    accountHolderName: true,
    confirmAccountNumber: true
  });
  
  // Load user data
  useEffect(() => {
    const loadUserData = async () => {
      if (user) {
        // No longer prepopulating the account holder name field
        // since it needs to match exactly what's on the bank account
        
        setLoading(false);
      } else if (!loading) {
        openAuthModal('signin', '/seller/bank-details' + location.search);
      }
    };
    
    loadUserData();
  }, [user, loading, navigate]);
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Reset validation errors when user types
    setValidation(prev => ({ ...prev, [name]: true }));
  };
  
  const validateForm = () => {
    const newValidation = {
      accountNumber: formData.accountNumber.length >= 8,
      routingNumber: formData.routingNumber.length === 9,
      accountHolderName: formData.accountHolderName.trim().length > 0,
      confirmAccountNumber: formData.accountNumber === formData.confirmAccountNumber
    };
    
    setValidation(newValidation);
    return Object.values(newValidation).every(isValid => isValid);
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      setError('Please correct the errors in the form.');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Call API to add bank account
      const result = await addBankAccount(user.uid, {
        accountNumber: formData.accountNumber,
        routingNumber: formData.routingNumber,
        accountHolderName: formData.accountHolderName
      });
      
      if (result.success) {
        setSuccess(true);
        
        // Update the user's record directly in Firestore to mark them as a verified seller
        try {
          const userDocRef = doc(db, 'users', user.uid);
          await updateDoc(userDocRef, {
            needsBankDetails: false,
            isSeller: true,        // Keep for backward compatibility
            // Create a structured seller object
            seller: {
              isSeller: true,
              hasBankAccount: true,
              stripeStatus: 'active',
              payoutsEnabled: true,
              detailsSubmitted: true,
              verified: true,
              sellerSince: new Date().toISOString(),
              lastStatusUpdate: serverTimestamp()
            }
          });
          console.log("Updated user record to indicate bank account added and seller status");
        } catch (firestoreError) {
          console.error("Error updating user record:", firestoreError);
          // Continue anyway - this error shouldn't block the user's progress
        }
        
        // Check if there's a pending tool listing to create
        const pendingToolListingJSON = localStorage.getItem('pendingToolListing');
        
        // Wait 4 seconds to show success message
        setTimeout(() => {
          if (pendingToolListingJSON) {
            // There's a pending tool listing - redirect to create it
            navigate('/seller/create-pending-listing');
          } else {
            // No pending listing - redirect to dashboard
            navigate('/seller/dashboard?newSeller=true');
          }
        }, 4000);
      } else {
        throw new Error(result.error || 'Failed to add bank account');
      }
    } catch (err) {
      console.error('Error adding bank account:', err);
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
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
        <div className="bg-white rounded-lg shadow-md p-6 md:p-8">
          <h1 className="text-2xl md:text-3xl font-medium text-gray-800 mb-2">
            Complete Your Seller Setup
          </h1>
          <p className="text-gray-600 mb-6">
            Enter your bank account details to receive payments for your tool sales
          </p>
          
          {/* Success message */}
          {success && (
            <div className="bg-green-50 border border-green-100 text-green-700 px-6 py-6 rounded-md mb-6">
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <Check className="h-8 w-8 text-green-600" />
                </div>
                <h2 className="text-xl font-medium text-green-800 mb-2">Bank Account Added Successfully!</h2>
                <p className="text-green-700 mb-3">Your account details have been securely saved.</p>
                <div className="w-full max-w-xs bg-white rounded-full h-2 mb-3">
                  <div className="bg-green-500 h-2 rounded-full animate-pulse"></div>
                </div>
                <p className="text-sm text-green-600">Preparing your tool listing...</p>
              </div>
            </div>
          )}
          
          {/* Error message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6 flex items-start">
              <AlertTriangle className="h-5 w-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-green-50 border border-green-100 p-4 rounded-md mb-4">
              <div className="flex items-start">
                <div className="mr-3 flex-shrink-0 mt-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-green-800 font-medium mb-1">Fast & Simple Seller Setup</h4>
                  <p className="text-green-700 text-sm mb-2">
                    We've made it easy to start selling! Just provide your basic account details below and you'll be ready to list your tools right away.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center mb-6 bg-gray-50 p-3 border border-gray-100 rounded-md">
              <div className="mr-3 flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="text-gray-600 text-sm">
                <span className="font-medium">Your information is secure:</span> All data is encrypted and securely processed by Stripe, our trusted payment partner.
              </p>
            </div>
            
            {/* Account Holder Name */}
            <div className="bg-white p-5 rounded-md border border-gray-200 shadow-sm">
              <label className="block text-gray-700 font-medium mb-1" htmlFor="accountHolderName">
                Account Holder Name*
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                </div>
                <input
                  type="text"
                  id="accountHolderName"
                  name="accountHolderName"
                  value={formData.accountHolderName}
                  onChange={handleChange}
                  placeholder="Exactly as it appears on your bank account"
                  className={`w-full pl-10 pr-3 py-3 border rounded-md focus:outline-none ${
                    validation.accountHolderName 
                      ? 'border-gray-300 focus:border-green-700 focus:ring-1 focus:ring-green-700' 
                      : 'border-red-300 focus:border-red-500'
                  }`}
                  required
                />
              </div>
              {!validation.accountHolderName && (
                <p className="text-red-500 text-sm mt-1">Account holder name is required</p>
              )}
              <p className="text-sm text-gray-500 mt-1">
                Enter the <strong>exact name</strong> that appears on your bank account records
              </p>
            </div>
            
            {/* Routing Number */}
            <div className="bg-white p-5 rounded-md border border-gray-200 shadow-sm">
              <label className="block text-gray-700 font-medium mb-1" htmlFor="routingNumber">
                Routing Number*
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                  </svg>
                </div>
                <input
                  type="text"
                  id="routingNumber"
                  name="routingNumber"
                  value={formData.routingNumber}
                  onChange={handleChange}
                  className={`w-full pl-10 pr-3 py-3 border rounded-md focus:outline-none ${
                    validation.routingNumber 
                      ? 'border-gray-300 focus:border-green-700 focus:ring-1 focus:ring-green-700' 
                      : 'border-red-300 focus:border-red-500'
                  }`}
                  placeholder="9 digits"
                  required
                />
              </div>
              {!validation.routingNumber && (
                <p className="text-red-500 text-sm mt-1">Valid 9-digit routing number is required</p>
              )}
              <p className="text-sm text-gray-500 mt-1">
                The 9-digit routing number from the bottom of your checks
              </p>
            </div>
            
            {/* Account Number */}
            <div className="bg-white p-5 rounded-md border border-gray-200 shadow-sm">
              <label className="block text-gray-700 font-medium mb-1" htmlFor="accountNumber">
                Account Number*
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <input
                  type="password"
                  id="accountNumber"
                  name="accountNumber"
                  value={formData.accountNumber}
                  onChange={handleChange}
                  className={`w-full pl-10 pr-3 py-3 border rounded-md focus:outline-none ${
                    validation.accountNumber 
                      ? 'border-gray-300 focus:border-green-700 focus:ring-1 focus:ring-green-700' 
                      : 'border-red-300 focus:border-red-500'
                  }`}
                  required
                />
              </div>
              {!validation.accountNumber && (
                <p className="text-red-500 text-sm mt-1">Valid account number is required (8+ digits)</p>
              )}
            </div>
            
            {/* Confirm Account Number */}
            <div className="bg-white p-5 rounded-md border border-gray-200 shadow-sm">
              <label className="block text-gray-700 font-medium mb-1" htmlFor="confirmAccountNumber">
                Confirm Account Number*
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <input
                  type="password"
                  id="confirmAccountNumber"
                  name="confirmAccountNumber"
                  value={formData.confirmAccountNumber}
                  onChange={handleChange}
                  className={`w-full pl-10 pr-3 py-3 border rounded-md focus:outline-none ${
                    validation.confirmAccountNumber 
                      ? 'border-gray-300 focus:border-green-700 focus:ring-1 focus:ring-green-700' 
                      : 'border-red-300 focus:border-red-500'
                  }`}
                  required
                />
              </div>
              {!validation.confirmAccountNumber && (
                <p className="text-red-500 text-sm mt-1">Account numbers do not match</p>
              )}
            </div>
            
            <div className="pt-4">
              <button
                type="submit"
                disabled={isSubmitting || success}
                className="w-full py-4 bg-green-700 text-white rounded-md hover:bg-green-800 font-medium flex items-center justify-center shadow-md"
              >
                {isSubmitting ? (
                  <>
                    <span className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
                    Processing securely...
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                    Save Bank Account Securely
                  </>
                )}
              </button>
              <p className="text-center text-xs text-gray-500 mt-3">
                By clicking this button, you agree to our <a href="/terms" className="text-green-700 hover:underline">Terms of Service</a> and <a href="/privacy" className="text-green-700 hover:underline">Privacy Policy</a>
              </p>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default BankDetailsPage;