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
      <div className="min-h-screen flex justify-center items-center">
        <div className="text-center">
          <div className="text-2xl font-bold mb-2">Loading...</div>
          <div className="text-gray-500">Please wait while we load your listings.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">My Tool Listings</h1>
        <Link
          to="/tools/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-md font-medium hover:bg-blue-700"
        >
          Add New Listing
        </Link>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {listings.length === 0 ? (
        <div className="bg-white p-6 rounded-lg shadow-md text-center">
          <h2 className="text-xl font-semibold mb-4">No Listings Yet</h2>
          <p className="text-gray-600 mb-4">
            You haven't created any tool listings yet. Get started by adding your first listing!
          </p>
          <Link
            to="/tools/new"
            className="bg-blue-600 text-white px-4 py-2 rounded-md font-medium hover:bg-blue-700"
          >
            Create Your First Listing
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {listings.map((tool) => (
            <div key={tool.id} className="bg-white p-4 rounded-lg shadow-md flex flex-wrap md:flex-nowrap gap-4">
              {/* Tool Image */}
              <div className="w-full md:w-48 h-48 flex-shrink-0">
                <Link to={`/tools/${tool.id}`}>
                  <ToolImage
                    tool={tool}
                    className="w-full h-full object-cover rounded-md"
                  />
                </Link>
              </div>
              
              {/* Tool Details */}
              <div className="flex-grow">
                <div className="flex justify-between items-start">
                  <Link to={`/tools/${tool.id}`} className="text-xl font-semibold hover:text-blue-500">
                    {tool.name}
                  </Link>
                  <div className="text-sm px-2 py-1 rounded-full font-medium 
                    ${tool.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}"
                  >
                    {tool.status === 'active' ? 'Active' : tool.status}
                  </div>
                </div>
                
                <div className="text-sm text-gray-600 mb-2">
                  Category: {tool.category} • Condition: {tool.condition}
                  {tool.location && ` • Location: ${tool.location}`}
                </div>
                
                <div className="text-lg font-bold text-blue-600 mb-2">
                  ${tool.current_price ? tool.current_price.toFixed(0) : '0'}
                </div>
                
                <div className="text-sm text-gray-500 mb-4">
                  Created: {tool.created_at ? new Date(tool.created_at.seconds * 1000).toLocaleDateString() : 'Recently'}
                </div>
                
                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2">
                  <Link
                    to={`/tools/${tool.id}`}
                    className="px-3 py-1 bg-gray-100 text-gray-800 rounded font-medium hover:bg-gray-200"
                  >
                    View
                  </Link>
                  <Link
                    to={`/tools/edit/${tool.id}`}
                    className="px-3 py-1 bg-blue-100 text-blue-800 rounded font-medium hover:bg-blue-200"
                  >
                    Edit
                  </Link>
                  <button
                    onClick={() => confirmDelete(tool.id)}
                    className="px-3 py-1 bg-red-100 text-red-800 rounded font-medium hover:bg-red-200"
                  >
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
            <h3 className="text-xl font-bold mb-4">Confirm Deletion</h3>
            <p className="mb-6">
              Are you sure you want to delete this listing? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded font-medium hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyListings;