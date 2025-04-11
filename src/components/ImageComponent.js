/**
 * Reliable Image Component
 * Handles image loading with fallbacks and error handling
 */
import React, { useState } from 'react';

const ImageComponent = ({ 
  src, 
  alt = 'Image', 
  className = 'object-cover',
  width,
  height,
  fallbackSrc = '/placeholder.jpg',
  placeholderText = null
}) => {
  const [imageError, setImageError] = useState(false);
  
  // Handle image loading error
  const handleError = () => {
    console.log('Image failed to load:', src);
    setImageError(true);
  };

  // Generate a placeholder image if no source or fallback
  const generatePlaceholder = () => {
    // If specific placeholder text is provided, use it
    const text = placeholderText || alt || 'Image';
    
    // Create a placeholder image with the text
    // Using via.placeholder.com for demonstration
    const placeholderWidth = width || 300;
    const placeholderHeight = height || 200;
    return `https://via.placeholder.com/${placeholderWidth}x${placeholderHeight}?text=${encodeURIComponent(text)}&cachebuster=${Date.now()}`;
  };

  // Determine the image source to use
  const getImageSource = () => {
    if (imageError) {
      return fallbackSrc || generatePlaceholder();
    }
    
    if (!src) {
      return fallbackSrc || generatePlaceholder();
    }
    
    return src;
  };

  return (
    <img
      src={getImageSource()}
      alt={alt}
      className={className}
      width={width}
      height={height}
      onError={handleError}
    />
  );
};

export default ImageComponent;