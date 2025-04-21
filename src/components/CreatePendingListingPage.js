import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
import { useAuth } from '../firebase/hooks/useAuth';
import { createTool, uploadToolImage } from '../firebase/models/toolModel';

/**
 * CreatePendingListingPage
 * Handles the automatic creation of a pending tool listing after Stripe onboarding
 */
const CreatePendingListingPage = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [toolId, setToolId] = useState(null);
  
  useEffect(() => {
    // Check if user is authenticated
    if (!isAuthenticated()) {
      navigate('/login', { state: { from: '/seller/create-pending-listing' } });
      return;
    }
    
    const createPendingListing = async () => {
      try {
        // Get the pending listing data from localStorage
        const pendingListingJSON = localStorage.getItem('pendingToolListing');
        
        if (!pendingListingJSON) {
          // No pending listing found, redirect to dashboard
          navigate('/seller/dashboard');
          return;
        }
        
        // Parse the pending listing data
        const pendingTool = JSON.parse(pendingListingJSON);
        
        // Create the tool
        const newTool = await createTool(pendingTool, user.uid);
        setToolId(newTool.id);
        
        // Clear the stored data
        localStorage.removeItem('pendingToolListing');
        localStorage.removeItem('draftToolName');
        
        setSuccess(true);
        setLoading(false);
        
        // After a delay, redirect to the tool detail page
        setTimeout(() => {
          navigate(`/tools/${newTool.id}?status=published`);
        }, 2000);
        
      } catch (err) {
        console.error('Error creating pending listing:', err);
        setError('Failed to create your listing. Please try again.');
        setLoading(false);
      }
    };
    
    createPendingListing();
  }, [user, navigate, isAuthenticated]);
  
  if (loading) {
    return (
      <div className="bg-gray-100 min-h-screen">
        <main className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-white rounded-lg shadow-md p-8">
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-12 h-12 border-4 border-t-transparent border-green-700 rounded-full animate-spin mb-4"></div>
              <h2 className="text-xl font-medium text-gray-800 mb-2">Creating Your Listing</h2>
              <p className="text-gray-600 text-center">
                Please wait while we create your tool listing...
              </p>
            </div>
          </div>
        </main>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-gray-100 min-h-screen">
        <main className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-white rounded-lg shadow-md p-8">
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
              {error}
            </div>
            <div className="flex justify-center">
              <button 
                onClick={() => navigate('/seller/dashboard')}
                className="px-4 py-2 bg-gray-200 rounded-md text-gray-700 hover:bg-gray-300"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }
  
  return (
    <div className="bg-gray-100 min-h-screen">
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="flex flex-col items-center justify-center py-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-medium text-gray-800 mb-2">Listing Created Successfully!</h2>
            <p className="text-gray-600 text-center mb-6">
              Your tool listing has been created and is now live on Benchlot.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button 
                onClick={() => navigate(`/tools/${toolId}`)}
                className="px-6 py-2 bg-green-700 text-white rounded-md hover:bg-green-800"
              >
                View Listing
              </button>
              <button 
                onClick={() => navigate('/seller/dashboard')}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CreatePendingListingPage;