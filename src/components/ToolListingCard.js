/**
 * Tool Listing Card Component
 * Displays a tool listing in card format
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

  // Check if discount is available
  const hasDiscount = tool.original_price && tool.current_price < tool.original_price;

  return (
    <div 
      className={`
        flex flex-col rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow
        ${featured ? 'border-2 border-blue-400' : 'border border-gray-200'}
      `}
    >
      {/* Featured badge */}
      {featured && (
        <div className="absolute top-2 right-2 bg-blue-500 text-white px-2 py-1 rounded-full text-xs font-bold">
          Featured
        </div>
      )}
      
      {/* Tool image */}
      <Link to={`/tools/${tool.id}`} className="w-full h-48 overflow-hidden">
        <ToolImage 
          tool={tool} 
          index={0} 
          className="w-full h-full object-cover" 
        />
        
        {/* Verified badge (if tool is verified) */}
        {tool.verified && (
          <div className="absolute top-2 left-2 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-bold">
            ✓ Verified
          </div>
        )}
      </Link>
      
      {/* Tool details */}
      <div className="p-4 flex flex-col flex-grow">
        <Link to={`/tools/${tool.id}`} className="text-lg font-semibold hover:text-blue-500 mb-1">
          {tool.name}
        </Link>
        
        <div className="text-sm text-gray-600 mb-1">
          Condition: <span className="font-medium">{tool.condition}</span>
        </div>
        
        {tool.brand && (
          <div className="text-sm text-gray-600 mb-1">
            Brand: <span className="font-medium">{tool.brand}</span>
          </div>
        )}
        
        {/* Price section */}
        <div className="mt-auto">
          {hasDiscount && (
            <span className="text-sm text-gray-500 line-through mr-2">
              {formatPrice(tool.original_price)}
            </span>
          )}
          <span className="text-lg font-bold text-blue-600">
            {formatPrice(tool.current_price)}
          </span>
        </div>
        
        {/* Location and seller info */}
        <div className="mt-2 text-sm text-gray-500 flex flex-wrap items-center justify-between">
          <div>
            {tool.location && (
              <span>📍 {tool.location}</span>
            )}
          </div>
          
          {tool.seller_rating && (
            <div className="ml-auto">
              ⭐ {tool.seller_rating}/5
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ToolListingCard;