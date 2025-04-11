/**
 * Tool Detail Component
 * Displays detailed information about a tool listing
 */
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getToolById } from '../firebase/models/toolModel';
import { useAuth } from '../firebase';
import ImageComponent from './ImageComponent';

const ToolDetail = () => {
  const { id } = useParams();
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  const [tool, setTool] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Load tool data
  useEffect(() => {
    const loadTool = async () => {
      try {
        setLoading(true);
        const toolData = await getToolById(id);
        setTool(toolData);
        setError(null);
      } catch (err) {
        console.error('Error loading tool:', err);
        setError('Failed to load this listing. It may have been removed or is unavailable.');
      } finally {
        setLoading(false);
      }
    };
    
    loadTool();
  }, [id]);

  // Format price as USD
  const formatPrice = (price) => {
    if (!price && price !== 0) return 'Price not set';
    
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(price);
  };

  // Check if user is the owner of this tool
  const isOwner = () => {
    return isAuthenticated() && user && tool && user.uid === tool.user_id;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <div className="text-center">
          <div className="text-2xl font-bold mb-2">Loading...</div>
          <div className="text-gray-500">Please wait while we load the listing details.</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-5xl mx-auto p-4">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
        <div className="text-center mt-4">
          <Link to="/" className="text-blue-600 hover:text-blue-800">
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  if (!tool) {
    return null;
  }

  return (
    <div className="max-w-5xl mx-auto p-4">
      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="mb-4 flex items-center text-gray-600 hover:text-gray-900"
      >
        ← Back
      </button>
      
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="md:flex">
          {/* Left Column - Images */}
          <div className="w-full md:w-1/2 p-4">
            {/* Main Image */}
            <div className="h-80 mb-4 relative">
              {tool.images && tool.images.length > 0 ? (
                <img
                  src={tool.images[activeImageIndex].url}
                  alt={tool.name}
                  className="w-full h-full object-contain rounded-md"
                />
              ) : (
                <ImageComponent
                  placeholderText={tool.name}
                  className="w-full h-full object-contain rounded-md"
                />
              )}
              
              {/* Verified Badge */}
              {tool.verified && (
                <div className="absolute top-2 left-2 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-bold">
                  ✓ Verified
                </div>
              )}
              
              {/* Featured Badge */}
              {tool.featured && (
                <div className="absolute top-2 right-2 bg-blue-500 text-white px-2 py-1 rounded-full text-xs font-bold">
                  Featured
                </div>
              )}
            </div>
            
            {/* Thumbnail Images */}
            {tool.images && tool.images.length > 1 && (
              <div className="flex flex-wrap gap-2 justify-center">
                {tool.images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setActiveImageIndex(index)}
                    className={`w-16 h-16 rounded-md overflow-hidden border-2 
                      ${activeImageIndex === index ? 'border-blue-500' : 'border-gray-200'}`}
                  >
                    <img
                      src={image.url}
                      alt={`${tool.name} thumbnail ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {/* Right Column - Details */}
          <div className="w-full md:w-1/2 p-4 border-t md:border-t-0 md:border-l border-gray-200">
            <div className="mb-2 flex justify-between items-start">
              <h1 className="text-2xl font-bold">{tool.name}</h1>
              <div className="text-sm px-2 py-1 rounded-full font-medium
                ${tool.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}"
              >
                {tool.status === 'active' ? 'Active' : tool.status}
              </div>
            </div>
            
            {/* Price */}
            <div className="mb-4">
              {tool.original_price && tool.original_price > tool.current_price && (
                <span className="text-gray-500 line-through mr-2">
                  {formatPrice(tool.original_price)}
                </span>
              )}
              <span className="text-2xl font-bold text-blue-600">
                {formatPrice(tool.current_price)}
              </span>
            </div>
            
            {/* Basic Details */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-4 text-sm">
              <div>
                <span className="text-gray-600">Category:</span>{' '}
                <span className="font-medium">{tool.category}</span>
              </div>
              <div>
                <span className="text-gray-600">Condition:</span>{' '}
                <span className="font-medium">{tool.condition}</span>
              </div>
              {tool.brand && (
                <div>
                  <span className="text-gray-600">Brand:</span>{' '}
                  <span className="font-medium">{tool.brand}</span>
                </div>
              )}
              {tool.model && (
                <div>
                  <span className="text-gray-600">Model:</span>{' '}
                  <span className="font-medium">{tool.model}</span>
                </div>
              )}
              {tool.age && (
                <div>
                  <span className="text-gray-600">Age:</span>{' '}
                  <span className="font-medium">{tool.age}</span>
                </div>
              )}
              {tool.location && (
                <div>
                  <span className="text-gray-600">Location:</span>{' '}
                  <span className="font-medium">{tool.location}</span>
                </div>
              )}
              {tool.material && (
                <div>
                  <span className="text-gray-600">Material:</span>{' '}
                  <span className="font-medium">{tool.material}</span>
                </div>
              )}
              {tool.dimensions && (
                <div>
                  <span className="text-gray-600">Dimensions:</span>{' '}
                  <span className="font-medium">{tool.dimensions}</span>
                </div>
              )}
              {tool.created_at && (
                <div>
                  <span className="text-gray-600">Listed:</span>{' '}
                  <span className="font-medium">
                    {new Date(tool.created_at.seconds * 1000).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
            
            {/* Description */}
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-2">Description</h2>
              <p className="text-gray-700 whitespace-pre-line">{tool.description}</p>
            </div>
            
            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              {isOwner() ? (
                <>
                  <Link
                    to={`/tools/edit/${tool.id}`}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700"
                  >
                    Edit Listing
                  </Link>
                  <Link
                    to="/my-listings"
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md font-medium hover:bg-gray-300"
                  >
                    My Listings
                  </Link>
                </>
              ) : (
                <>
                  <button
                    className="px-4 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700"
                    onClick={() => {
                      // Temporary placeholder - will implement cart functionality later
                      alert('Add to cart functionality coming soon!');
                    }}
                  >
                    Add to Cart
                  </button>
                  <button
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md font-medium hover:bg-gray-300"
                    onClick={() => {
                      // Temporary placeholder - will implement contact functionality later
                      alert('Contact seller functionality coming soon!');
                    }}
                  >
                    Contact Seller
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ToolDetail;