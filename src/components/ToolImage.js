/**
 * Tool Image Component
 * Displays tool images with fallbacks
 */
import React from 'react';
import ImageComponent from './ImageComponent';

const ToolImage = ({ 
  tool, 
  index = 0, 
  className = 'object-cover', 
  width, 
  height 
}) => {
  // Get the image URL from the tool data
  const getImageUrl = () => {
    // Check if the tool has images array
    if (tool?.images && tool.images.length > index) {
      return tool.images[index].url;
    }
    
    // Fallback to a single image URL if available
    if (tool?.imageUrl) {
      return tool.imageUrl;
    }
    
    // No image found
    return null;
  };

  // Generate alt text from tool name/title
  const getAltText = () => {
    return tool?.name || tool?.title || 'Tool image';
  };

  return (
    <ImageComponent
      src={getImageUrl()}
      alt={getAltText()}
      className={className}
      width={width}
      height={height}
      placeholderText={getAltText()}
    />
  );
};

export default ToolImage;