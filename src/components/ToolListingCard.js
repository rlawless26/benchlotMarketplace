/**
 * Tool Listing Card Component
 * Displays a tool listing in card format with Benchlot forest green styling
 */
import React from 'react';
import { Link } from 'react-router-dom';
import ToolImage from './ToolImage';

const ToolListingCard = ({ tool, featured = false }) => {
  // Format price as USD
  const formatPrice = (price) => {
    if (!price && price !== 0) return 'Price not set';
    
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(price);
  };

  // Use price correctly based on what's available
  const displayPrice = tool.price || tool.current_price || 0;
  const originalPrice = tool.original_price;
  const hasDiscount = originalPrice && displayPrice < originalPrice;

  return (
    <div 
      className={`
        bg-white rounded-lg overflow-hidden shadow-card hover:shadow-card-hover 
        transition-all duration-200 flex flex-col h-full relative
        ${featured ? 'ring-2 ring-benchlot-primary' : 'border border-gray-100'}
      `}
    >
      {/* Featured badge */}
      {featured && (
        <div className="absolute top-2 right-2 z-10 bg-benchlot-primary text-white px-2.5 py-1 text-xs font-medium rounded-full shadow-sm">
          Featured
        </div>
      )}
      
      {/* Tool image container */}
      <Link to={`/tools/${tool.id}`} className="relative block aspect-[4/3] overflow-hidden bg-gray-100">
        <ToolImage 
          tool={tool} 
          index={0} 
          className="w-full h-full object-cover transition-transform duration-300 hover:scale-105" 
        />
        
        {/* Verified badge */}
        {tool.verified && (
          <div className="absolute top-2 left-2 z-10 bg-green-600 text-white px-2.5 py-1 text-xs font-medium rounded-full shadow-sm">
            <span className="mr-0.5">✓</span> Verified
          </div>
        )}
      </Link>
      
      {/* Tool details */}
      <div className="p-4 flex flex-col flex-grow">
        <Link to={`/tools/${tool.id}`} className="text-lg font-serif font-semibold text-benchlot-text-primary hover:text-benchlot-primary transition-colors duration-150 mb-1 line-clamp-2">
          {tool.name}
        </Link>
        
        <div className="mt-1 space-y-2 mb-3">
          {tool.category && (
            <div className="inline-block bg-benchlot-accent-light text-benchlot-primary text-xs font-medium px-2.5 py-1 rounded-full">
              {tool.category}
            </div>
          )}
          
          <div className="flex flex-wrap gap-x-4 text-sm text-benchlot-text-secondary">
            {tool.condition && (
              <div>
                Condition: <span className="font-medium">{tool.condition}</span>
              </div>
            )}
            
            {tool.brand && (
              <div>
                Brand: <span className="font-medium">{tool.brand}</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Price section */}
        <div className="mt-auto">
          <div className="flex items-baseline">
            {hasDiscount && (
              <span className="text-sm text-gray-500 line-through mr-2">
                {formatPrice(originalPrice)}
              </span>
            )}
            <span className="text-xl font-bold text-benchlot-primary">
              {formatPrice(displayPrice)}
            </span>
            {tool.rental_period && (
              <span className="ml-1 text-xs text-benchlot-text-secondary">
                /{tool.rental_period}
              </span>
            )}
          </div>
        </div>
        
        {/* Location and seller info */}
        <div className="mt-3 pt-3 border-t border-benchlot-accent-light text-sm text-benchlot-text-secondary flex flex-wrap items-center justify-between">
          <div>
            {tool.location && (
              <span className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1 text-benchlot-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {tool.location}
              </span>
            )}
          </div>
          
          {tool.seller_rating && (
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-yellow-400 mr-0.5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span>{tool.seller_rating}/5</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ToolListingCard;