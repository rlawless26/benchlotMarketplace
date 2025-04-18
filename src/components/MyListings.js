/**
 * My Listings Component
 * Displays a user's tool listings with management options
 */
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../firebase';
import { getToolsByUserId, deleteTool } from '../firebase/models/toolModel';
import ToolImage from './ToolImage';

const MyListings = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Load user's tool listings
  useEffect(() => {
    const loadListings = async () => {
      if (!isAuthenticated() || !user) {
        navigate('/login', { state: { redirect: '/my-listings' } });
        return;
      }
      
      try {
        setLoading(true);
        const userTools = await getToolsByUserId(user.uid);
        setListings(userTools);
        setError(null);
      } catch (err) {
        console.error('Error loading listings:', err);
        setError('Failed to load your listings. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    loadListings();
  }, [user, isAuthenticated, navigate]);

  // Handle delete confirmation
  const confirmDelete = (toolId) => {
    setDeleteId(toolId);
    setShowDeleteModal(true);
  };

  // Handle tool deletion
  const handleDelete = async () => {
    try {
      setLoading(true);
      await deleteTool(deleteId);
      setListings(prevListings => prevListings.filter(tool => tool.id !== deleteId));
      setShowDeleteModal(false);
      setDeleteId(null);
    } catch (err) {
      console.error('Error deleting tool:', err);
      setError('Failed to delete listing. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading && listings.length === 0) {
    return (
      <div className="bg-gray-100 min-h-screen py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-serif font-medium text-stone-800 mb-2">My Tool Listings</h1>
              <p className="text-stone-600">Manage your tool listings and track their performance</p>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-8 flex justify-center min-h-[300px] items-center">
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 border-4 border-benchlot-primary border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-4 text-stone-600 font-medium">Loading your listings...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-100 min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-serif font-medium text-stone-800 mb-2">My Tool Listings</h1>
            <p className="text-stone-600">Manage your tool listings and track their performance</p>
          </div>
          <Link
            to="/tools/new"
            className="bg-benchlot-primary hover:bg-benchlot-secondary text-white font-medium py-2 px-4 rounded-md inline-flex items-center transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Add New Listing
          </Link>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
            <p>{error}</p>
          </div>
        )}

        {listings.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <div className="mx-auto w-16 h-16 mb-6 text-stone-300">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold mb-4 text-benchlot-primary">No Listings Yet</h2>
            <p className="text-stone-600 mb-6 max-w-md mx-auto">
              You haven't created any tool listings yet. Get started by adding your first listing!
            </p>
            <Link
              to="/tools/new"
              className="bg-benchlot-primary hover:bg-benchlot-secondary text-white font-medium py-2 px-4 rounded-md inline-flex items-center transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Create Your First Listing
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {listings.map((tool) => (
              <div key={tool.id} className="bg-white rounded-lg shadow-md p-4 sm:p-6 flex flex-col sm:flex-row gap-4 transition-all hover:shadow-lg">
                {/* Tool Image */}
                <div className="w-full sm:w-48 h-48 flex-shrink-0 bg-gray-100 rounded-md overflow-hidden">
                  <Link to={`/tools/${tool.id}`} className="block w-full h-full">
                    <ToolImage
                      tool={tool}
                      className="w-full h-full object-cover transition-transform hover:scale-105"
                    />
                  </Link>
                </div>
                
                {/* Tool Details */}
                <div className="flex-grow">
                  <div className="flex flex-wrap justify-between items-start gap-2 mb-2">
                    <Link to={`/tools/${tool.id}`} className="text-xl font-semibold text-benchlot-primary hover:text-benchlot-accent transition-colors">
                      {tool.name}
                    </Link>
                    <div className={`badge ${
                      tool.status === 'active' ? 'badge-success' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {tool.status === 'active' ? 'Active' : tool.status}
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-600 mb-3">
                    <span className="inline-flex items-center mr-3">
                      <svg className="h-4 w-4 mr-1 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M9.504 1.132a1 1 0 01.992 0l1.75 1a1 1 0 11-.992 1.736L10 3.152l-1.254.716a1 1 0 11-.992-1.736l1.75-1zM5.618 4.504a1 1 0 01-.372 1.364L5.016 6l.23.132a1 1 0 11-.992 1.736L4 7.723V8a1 1 0 01-2 0V6a.996.996 0 01.52-.878l1.734-.99a1 1 0 011.364.372zm8.764 0a1 1 0 011.364-.372l1.733.99A1.002 1.002 0 0118 6v2a1 1 0 11-2 0v-.277l-.254.145a1 1 0 11-.992-1.736l.23-.132-.23-.132a1 1 0 01-.372-1.364zm-7 4a1 1 0 011.364-.372L10 8.848l1.254-.716a1 1 0 11.992 1.736L11 10.58V12a1 1 0 11-2 0v-1.42l-1.246-.712a1 1 0 01-.372-1.364zM3 11a1 1 0 011 1v1.42l1.246.712a1 1 0 11-.992 1.736l-1.75-1A1 1 0 012 14v-2a1 1 0 011-1zm14 0a1 1 0 011 1v2a1 1 0 01-.504.868l-1.75 1a1 1 0 11-.992-1.736L16 13.42V12a1 1 0 011-1zm-9.618 5.504a1 1 0 011.364-.372l.254.145V16a1 1 0 112 0v.277l.254-.145a1 1 0 11.992 1.736l-1.735.992a.995.995 0 01-1.022 0l-1.735-.992a1 1 0 01-.372-1.364z" clipRule="evenodd" />
                      </svg>
                      {tool.category}
                    </span>
                    <span className="inline-flex items-center mr-3">
                      <svg className="h-4 w-4 mr-1 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                      </svg>
                      {tool.condition}
                    </span>
                    {tool.location && (
                      <span className="inline-flex items-center">
                        <svg className="h-4 w-4 mr-1 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                        </svg>
                        {tool.location}
                      </span>
                    )}
                  </div>
                  
                  <div className="text-lg font-bold text-benchlot-accent mb-3">
                    ${tool.current_price ? tool.current_price.toFixed(2) : '0.00'}
                  </div>
                  
                  <div className="text-sm text-gray-500 mb-4">
                    <span className="inline-flex items-center">
                      <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                      </svg>
                      Created: {tool.created_at ? new Date(tool.created_at.seconds * 1000).toLocaleDateString() : 'Recently'}
                    </span>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-2">
                    <Link
                      to={`/tools/${tool.id}`}
                      className="btn-secondary btn-sm inline-flex items-center"
                    >
                      <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      View
                    </Link>
                    <Link
                      to={`/tools/edit/${tool.id}`}
                      className="btn-sm bg-benchlot-accent text-white hover:bg-benchlot-accent-hover inline-flex items-center focus:ring-2 focus:ring-benchlot-accent focus:ring-offset-2 focus:outline-none rounded-md transition-colors"
                    >
                      <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit
                    </Link>
                    <button
                      onClick={() => confirmDelete(tool.id)}
                      className="btn-sm bg-red-100 text-red-700 hover:bg-red-200 inline-flex items-center focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:outline-none rounded-md transition-colors"
                    >
                      <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg max-w-md mx-4">
              <h3 className="text-xl font-bold text-benchlot-primary mb-4">Confirm Deletion</h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete this listing? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-4">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="btn-sm bg-benchlot-error text-white hover:bg-red-700 focus:ring-red-500 inline-flex items-center focus:ring-2 focus:ring-offset-2 focus:outline-none rounded-md px-4 py-2 transition-colors"
                >
                  Delete Permanently
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyListings;