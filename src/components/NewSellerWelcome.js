import React from 'react';
import { Link } from 'react-router-dom';

/**
 * NewSellerWelcome component
 * Displays a celebratory welcome message and next steps for new sellers
 * Shown on the dashboard when a seller completes Stripe onboarding
 */
const NewSellerWelcome = ({ accountStatus, onClose }) => {
  // Determine verification status
  const isVerified = accountStatus?.detailsSubmitted && accountStatus?.payoutsEnabled;
  const isPending = accountStatus?.detailsSubmitted && !accountStatus?.payoutsEnabled;

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
      {/* Header with celebration and close button */}
      <div className="bg-green-600 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center">
          <span className="text-2xl mr-2">🎉</span>
          <h2 className="text-xl font-bold text-white">Welcome to Benchlot Sellers!</h2>
        </div>
        {onClose && (
          <button 
            onClick={onClose} 
            className="text-white hover:text-green-100"
            aria-label="Close welcome message"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        )}
      </div>

      {/* Main content */}
      <div className="p-6">
        <p className="text-gray-700 mb-6">
          You've successfully created your seller account. You're now ready to start listing tools and earning money on Benchlot!
        </p>

        {/* Verification status */}
        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <h3 className="font-medium text-gray-900 mb-2">Account Status</h3>
          
          {isVerified && (
            <div className="flex items-center text-green-700">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Your account is fully verified and ready to receive payments</span>
            </div>
          )}
          
          {isPending && (
            <div className="flex items-center text-yellow-700">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
              <span>Your account is pending verification. Stripe is reviewing your information (1-2 business days).</span>
            </div>
          )}
          
          {!isVerified && !isPending && (
            <div className="flex items-center text-red-700">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span>Your account needs additional information. Please check your email for details from Stripe.</span>
            </div>
          )}
        </div>

        {/* Getting started checklist */}
        <div className="mb-6">
          <h3 className="font-medium text-gray-900 mb-3">Getting Started Checklist</h3>
          <ul className="space-y-3">
            <li className="flex items-start">
              <div className={`flex-shrink-0 h-5 w-5 mr-2 ${isVerified ? 'text-green-500' : isPending ? 'text-yellow-500' : 'text-gray-400'}`}>
                {isVerified ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                ) : isPending ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <div>
                <p className="font-medium">Complete account verification</p>
                <p className="text-sm text-gray-500">
                  {isVerified 
                    ? 'Done! Your account is verified.' 
                    : isPending 
                      ? 'In progress. Stripe is reviewing your information.' 
                      : 'Please complete verification with Stripe.'}
                </p>
              </div>
            </li>
            
            <li className="flex items-start">
              <div className="flex-shrink-0 h-5 w-5 mr-2 text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <p className="font-medium">Complete your seller profile</p>
                <p className="text-sm text-gray-500">Add a bio, location, and contact info to build trust with buyers.</p>
              </div>
            </li>
            
            <li className="flex items-start">
              <div className="flex-shrink-0 h-5 w-5 mr-2 text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <p className="font-medium">Create your first listing</p>
                <p className="text-sm text-gray-500">List a tool for rent and start earning money.</p>
              </div>
            </li>
          </ul>
        </div>

        {/* Dashboard orientation */}
        <div className="mb-6">
          <h3 className="font-medium text-gray-900 mb-3">Your Seller Dashboard</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-800 mb-1">Listings</h4>
              <p className="text-sm text-gray-600">Manage your tools for rent and track their status.</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-800 mb-1">Orders</h4>
              <p className="text-sm text-gray-600">Track incoming orders, rentals, and returns.</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-800 mb-1">Earnings</h4>
              <p className="text-sm text-gray-600">Monitor your income and upcoming payouts.</p>
            </div>
          </div>
        </div>

        {/* Primary CTA */}
        <div className="text-center">
          <Link 
            to="/seller/tools/new"
            className="inline-block bg-green-700 text-white px-8 py-3 rounded-md text-lg font-medium hover:bg-green-800"
          >
            Create Your First Listing
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NewSellerWelcome;