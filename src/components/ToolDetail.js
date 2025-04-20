/**
 * Tool Detail Component
 * Displays detailed information about a tool listing
 */
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getToolById } from '../firebase/models/toolModel';
import { useAuth } from '../firebase';
import ImageComponent from './ImageComponent';
import AddToCartButton from './AddToCartButton';

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
      <div className="page-container min-h-[70vh] flex justify-center items-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-benchlot-accent border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-benchlot-primary font-medium">Loading listing details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container py-8">
        <div className="alert-error mb-6">
          <p>{error}</p>
        </div>
        <div className="text-center mt-6">
          <Link to="/" className="btn-primary">
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
    <div className="page-container py-8">
      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="mb-6 inline-flex items-center text-benchlot-primary hover:text-benchlot-secondary transition-colors"
      >
        <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to listings
      </button>
      
      <div className="card overflow-hidden">
        <div className="md:flex">
          {/* Left Column - Images */}
          <div className="w-full md:w-1/2 p-4 md:p-6">
            {/* Main Image */}
            <div className="aspect-square mb-4 relative bg-gray-100 rounded-md overflow-hidden">
              {tool.images && tool.images.length > 0 ? (
                <img
                  src={tool.images[activeImageIndex].url}
                  alt={tool.name}
                  className="w-full h-full object-contain"
                />
              ) : (
                <ImageComponent
                  placeholderText={tool.name}
                  className="w-full h-full object-contain"
                />
              )}
              
              {/* Verified Badge */}
              {tool.verified && (
                <div className="absolute top-3 left-3 badge badge-success flex items-center">
                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Verified
                </div>
              )}
              
              {/* Featured Badge */}
              {tool.featured && (
                <div className="absolute top-3 right-3 badge badge-accent">
                  Featured
                </div>
              )}
            </div>
            
            {/* Thumbnail Images */}
            {tool.images && tool.images.length > 1 && (
              <div className="flex flex-wrap gap-2 justify-start">
                {tool.images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setActiveImageIndex(index)}
                    className={`w-16 h-16 rounded-md overflow-hidden border-2 transition-all
                      ${activeImageIndex === index 
                        ? 'border-benchlot-accent shadow-sm' 
                        : 'border-gray-200 hover:border-gray-300'}`}
                    aria-label={`View image ${index + 1}`}
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
          <div className="w-full md:w-1/2 p-4 md:p-6 border-t md:border-t-0 md:border-l border-gray-200">
            <div className="mb-3 flex flex-wrap justify-between items-start gap-2">
              <h1 className="text-2xl md:text-3xl font-bold text-benchlot-primary">{tool.name}</h1>
              <div className={`badge ${
                tool.status === 'active' ? 'badge-success' : 'bg-gray-100 text-gray-800'
              }`}>
                {tool.status === 'active' ? 'Active' : tool.status}
              </div>
            </div>
            
            {/* Price */}
            <div className="mb-6">
              {tool.original_price && tool.original_price > tool.current_price && (
                <span className="text-gray-500 line-through mr-2">
                  {formatPrice(tool.original_price)}
                </span>
              )}
              <span className="text-2xl font-bold text-benchlot-accent">
                {formatPrice(tool.current_price || tool.price)}
              </span>
            </div>
            
            {/* Basic Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 mb-6 border-t border-b border-gray-200 py-4">
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M9.504 1.132a1 1 0 01.992 0l1.75 1a1 1 0 11-.992 1.736L10 3.152l-1.254.716a1 1 0 11-.992-1.736l1.75-1zM5.618 4.504a1 1 0 01-.372 1.364L5.016 6l.23.132a1 1 0 11-.992 1.736L4 7.723V8a1 1 0 01-2 0V6a.996.996 0 01.52-.878l1.734-.99a1 1 0 011.364.372zm8.764 0a1 1 0 011.364-.372l1.733.99A1.002 1.002 0 0118 6v2a1 1 0 11-2 0v-.277l-.254.145a1 1 0 11-.992-1.736l.23-.132-.23-.132a1 1 0 01-.372-1.364zm-7 4a1 1 0 011.364-.372L10 8.848l1.254-.716a1 1 0 11.992 1.736L11 10.58V12a1 1 0 11-2 0v-1.42l-1.246-.712a1 1 0 01-.372-1.364zM3 11a1 1 0 011 1v1.42l1.246.712a1 1 0 11-.992 1.736l-1.75-1A1 1 0 012 14v-2a1 1 0 011-1zm14 0a1 1 0 011 1v2a1 1 0 01-.504.868l-1.75 1a1 1 0 11-.992-1.736L16 13.42V12a1 1 0 011-1zm-9.618 5.504a1 1 0 011.364-.372l.254.145V16a1 1 0 112 0v.277l.254-.145a1 1 0 11.992 1.736l-1.735.992a.995.995 0 01-1.022 0l-1.735-.992a1 1 0 01-.372-1.364z" clipRule="evenodd" />
                </svg>
                <span className="text-gray-700">
                  <span className="font-medium">Category:</span> {tool.category}
                </span>
              </div>
              
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                </svg>
                <span className="text-gray-700">
                  <span className="font-medium">Condition:</span> {tool.condition}
                </span>
              </div>
              
              {tool.brand && (
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M13 7H7v6h6V7z" />
                    <path fillRule="evenodd" d="M7 2a1 1 0 012 0v1h2V2a1 1 0 112 0v1h2a2 2 0 012 2v2h1a1 1 0 110 2h-1v2h1a1 1 0 110 2h-1v2a2 2 0 01-2 2h-2v1a1 1 0 11-2 0v-1H9v1a1 1 0 11-2 0v-1H5a2 2 0 01-2-2v-2H2a1 1 0 110-2h1V9H2a1 1 0 010-2h1V5a2 2 0 012-2h2V2zM5 5h10v10H5V5z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700">
                    <span className="font-medium">Brand:</span> {tool.brand}
                  </span>
                </div>
              )}
              
              {tool.model && (
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M11 17a1 1 0 001.447.894l4-2A1 1 0 0017 15V9.236a1 1 0 00-1.447-.894l-4 2a1 1 0 00-.553.894V17zM15.211 6.276a1 1 0 000-1.788l-4.764-2.382a1 1 0 00-.894 0L4.789 4.488a1 1 0 000 1.788l4.764 2.382a1 1 0 00.894 0l4.764-2.382zM4.447 8.342A1 1 0 003 9.236V15a1 1 0 00.553.894l4 2A1 1 0 009 17v-5.764a1 1 0 00-.553-.894l-4-2z" />
                  </svg>
                  <span className="text-gray-700">
                    <span className="font-medium">Model:</span> {tool.model}
                  </span>
                </div>
              )}
              
              {tool.age && (
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700">
                    <span className="font-medium">Age:</span> {tool.age}
                  </span>
                </div>
              )}
              
              {tool.location && (
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700">
                    <span className="font-medium">Location:</span> {tool.location}
                  </span>
                </div>
              )}
              
              {tool.material && (
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 3a1 1 0 00-1.447-.894L12 5.236 6.447 2.106A1 1 0 005 3v14a1 1 0 001.447.894L12 14.764l5.553 3.13A1 1 0 0018 17V3zm-8.675 6.046L8.098 7.97 6 8.646v6.067l1.327-.795 2.667-1.591L12 10.971l2.006-1.197 2.674-1.6L18 7.354V1.289l-1.326.795-2.667 1.59L12 5.03l-2.006 1.197-2.675 1.59L6 8.646v.067l2.325.333z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700">
                    <span className="font-medium">Material:</span> {tool.material}
                  </span>
                </div>
              )}
              
              {tool.dimensions && (
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M12 4a1 1 0 01.707.293l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 9H3a1 1 0 110-2h11.586l-3.293-3.293A1 1 0 0112 4zm-8 8a1 1a1 1 0 00-.707.293l-4 4a1 1 0 000 1.414l4 4a1 1 0 001.414-1.414L1.414 17H13a1 1 0 100-2H1.414l3.293-3.293A1 1 0 004 12z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700">
                    <span className="font-medium">Dimensions:</span> {tool.dimensions}
                  </span>
                </div>
              )}
              
              {tool.created_at && (
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700">
                    <span className="font-medium">Listed:</span> {new Date(tool.created_at.seconds * 1000).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
            
            {/* Description */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-benchlot-primary mb-3">Description</h2>
              <div className="text-gray-700 whitespace-pre-line rounded-md bg-gray-50 p-4 border border-gray-200">
                {tool.description || "No description provided."}
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              {isOwner() ? (
                <>
                  <Link
                    to={`/tools/edit/${tool.id}`}
                    className="btn-accent inline-flex items-center"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit Listing
                  </Link>
                  <Link
                    to="/my-listings"
                    className="btn-secondary inline-flex items-center"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                    </svg>
                    My Listings
                  </Link>
                </>
              ) : (
                <>
                  <AddToCartButton tool={tool} extraClasses="btn-primary inline-flex items-center" />
                  <button
                    className="btn-secondary inline-flex items-center"
                    onClick={() => {
                      // Temporary placeholder - will implement contact functionality later
                      alert('Contact seller functionality coming soon!');
                    }}
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
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