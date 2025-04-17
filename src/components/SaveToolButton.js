/**
 * SaveToolButton Component
 * A reusable button component for saving tools to wishlist
 */
import React, { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import { useWishlist } from '../firebase/hooks/useWishlist';
import { useAuth } from '../firebase/hooks/useAuth';

const SaveToolButton = ({ 
  toolId, 
  className = '',
  iconOnly = false,
  showText = true,
  size = 'medium',  // small, medium, large
  variant = 'default', // default, outline, filled
  onSaveSuccess = () => {},
  onSaveError = () => {}
}) => {
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { checkInWishlist, toggleWishlist } = useWishlist();
  const { isAuthenticated } = useAuth();

  // Check if tool is in wishlist
  useEffect(() => {
    const checkWishlistStatus = async () => {
      if (!isAuthenticated()) {
        setIsInWishlist(false);
        return;
      }
      
      const inWishlist = await checkInWishlist(toolId);
      setIsInWishlist(inWishlist);
    };
    
    checkWishlistStatus();
  }, [toolId, checkInWishlist, isAuthenticated]);
  
  // Toggle wishlist status
  const handleToggleWishlist = async (e) => {
    // Prevent event from bubbling up to parent (important for card clicks)
    e.preventDefault();
    e.stopPropagation();
    
    setIsProcessing(true);
    
    try {
      const result = await toggleWishlist(toolId);
      
      if (result.success) {
        setIsInWishlist(result.inWishlist);
        onSaveSuccess(result.inWishlist);
      } else {
        onSaveError(result.error || 'Failed to update wishlist');
      }
    } catch (error) {
      console.error('Error toggling wishlist:', error);
      onSaveError(error.message || 'Failed to update wishlist');
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Determine icon size based on prop
  const getIconSize = () => {
    switch (size) {
      case 'small': return 'h-4 w-4';
      case 'large': return 'h-6 w-6';
      default: return 'h-5 w-5';
    }
  };
  
  // Determine button styles based on variant and size
  const getButtonClasses = () => {
    // Base classes that apply to all variants
    let classes = 'flex items-center justify-center transition-colors ';
    
    // Size-specific classes
    if (size === 'small') {
      classes += iconOnly ? 'p-1.5 ' : 'px-2 py-1.5 text-sm ';
    } else if (size === 'large') {
      classes += iconOnly ? 'p-3 ' : 'px-4 py-3 text-base ';
    } else {
      classes += iconOnly ? 'p-2 ' : 'px-3 py-2 text-sm ';
    }
    
    // Variant-specific classes
    if (variant === 'outline') {
      classes += isInWishlist 
        ? 'bg-red-50 text-red-600 border border-red-300 hover:bg-red-100 '
        : 'bg-white text-stone-600 border border-stone-300 hover:bg-stone-50 ';
    } else if (variant === 'filled') {
      classes += isInWishlist
        ? 'bg-red-600 text-white hover:bg-red-700 '
        : 'bg-benchlot-primary text-white hover:bg-benchlot-secondary ';
    } else {
      // Default variant
      classes += isInWishlist
        ? 'text-red-600 hover:text-red-700 '
        : 'text-stone-600 hover:text-benchlot-primary ';
    }
    
    // Add rounded corners for all variants
    classes += variant !== 'default' ? 'rounded-md ' : '';
    
    // Add user-provided classes
    classes += className;
    
    return classes;
  };
  
  return (
    <button
      onClick={handleToggleWishlist}
      className={getButtonClasses()}
      disabled={isProcessing}
      title={isInWishlist ? 'Remove from saved tools' : 'Save to wishlist'}
      aria-label={isInWishlist ? 'Remove from saved tools' : 'Save to wishlist'}
    >
      <Heart 
        className={`${getIconSize()} ${isInWishlist ? 'fill-current' : ''}`} 
      />
      
      {showText && !iconOnly && (
        <span className="ml-1">
          {isInWishlist ? 'Saved' : 'Save'}
        </span>
      )}
    </button>
  );
};

export default SaveToolButton;