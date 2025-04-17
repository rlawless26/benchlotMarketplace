/**
 * WishlistToolCard Component
 * Card component for displaying tool items in the wishlist
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, Check, MapPin, Trash2, ShoppingCart } from 'lucide-react';
import { useCart } from '../firebase/hooks/useCart';

const WishlistToolCard = ({ tool, onRemove }) => {
  const { addToCart } = useCart();
  
  // Get price from either price or current_price field
  const getPrice = () => {
    return tool.price || tool.current_price || null;
  };
  
  // Format price with $ and commas
  const formatPrice = (price) => {
    if (!price && price !== 0) return 'Price not set';
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(price);
  };

  // Calculate discount percentage
  const getDiscountPercentage = () => {
    const price = getPrice();
    if (tool.original_price && price && tool.original_price > price) {
      return Math.round((1 - price / tool.original_price) * 100);
    }
    return null;
  };

  const discountPercentage = getDiscountPercentage();
  
  // Handle adding to cart
  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Create item object expected by addToCart
    const cartItem = {
      toolId: tool.id,
      name: tool.name,
      price: getPrice() || 0,
      quantity: 1,
      imageUrl: tool.images && tool.images.length > 0 ? tool.images[0].url : null,
      userId: tool.user_id // Pass the user ID to ensure it gets back to the correct cart
    };
    
    addToCart(cartItem);
  };

  return (
    <div className="bg-white rounded-lg overflow-hidden shadow-md transition-transform hover:shadow-lg">
      <Link to={`/tools/${tool.id}`} className="block relative">
        <div className="h-48 bg-stone-100">
          {tool.images && tool.images.length > 0 ? (
            <img 
              src={tool.images[0].url}
              alt={tool.name || "Tool image"}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-stone-200">
              <span className="text-stone-500">No image</span>
            </div>
          )}
          
          {/* Badges */}
          <div className="absolute top-2 right-2 flex flex-col gap-1">
            {tool.verified && (
              <span className="bg-benchlot-primary text-white text-xs px-2 py-1 rounded-full flex items-center">
                <Check className="h-3 w-3 mr-1" />
                Verified
              </span>
            )}
            
            {discountPercentage && (
              <span className="bg-green-600 text-white text-xs px-2 py-1 rounded-full">
                {discountPercentage}% off
              </span>
            )}
          </div>
        </div>
      </Link>
      
      <div className="p-4">
        <div className="flex justify-between items-start">
          <Link to={`/tools/${tool.id}`} className="block flex-1">
            <h3 className="font-medium text-stone-800 hover:text-benchlot-primary truncate">{tool.name}</h3>
          </Link>
          <button 
            onClick={() => onRemove(tool.id)}
            className="text-stone-400 hover:text-red-500 ml-2 flex-shrink-0"
            title="Remove from saved tools"
            aria-label="Remove from saved tools"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        </div>
        
        <p className="text-sm text-stone-600 mt-1 mb-2">
          {tool.condition} {tool.brand && `• ${tool.brand}`}
        </p>
        
        <div className="flex justify-between items-end">
          <div>
            <div className="flex items-baseline">
              <span className="text-lg font-medium text-benchlot-primary">
                {formatPrice(getPrice())}
              </span>
              {tool.original_price && getPrice() && tool.original_price > getPrice() && (
                <span className="ml-2 text-sm text-stone-500 line-through">
                  {formatPrice(tool.original_price)}
                </span>
              )}
            </div>
            
            <div className="flex items-center text-sm text-stone-500 mt-1.5">
              <MapPin className="h-3 w-3 mr-1" />
              <span>{tool.location || 'Location unavailable'}</span>
            </div>
          </div>
          
          <button 
            onClick={handleAddToCart}
            className="text-benchlot-primary hover:text-benchlot-secondary flex items-center text-sm"
            title="Add to cart"
          >
            <ShoppingCart className="h-4 w-4 mr-1" />
            Add to cart
          </button>
        </div>
      </div>
    </div>
  );
};

export default WishlistToolCard;