/**
 * Reliable Image Component
 * Handles image loading with fallbacks and error handling for Benchlot
 */
import React, { useState } from 'react';

/**
 * Generates an inline SVG data URI placeholder image.
 * @param {number} width - Placeholder width
 * @param {number} height - Placeholder height
 * @param {string} text - Text to display on the placeholder
 * @returns {string} Data URI string for the SVG
 */
const generatePlaceholder = (width, height, text) => {
  const svgWidth = width || 300;
  const svgHeight = height || 200;
  const displayText = text || 'Image';
  const truncatedText = displayText.length > 30
    ? displayText.substring(0, 27) + '...'
    : displayText;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}">
    <rect width="100%" height="100%" fill="#E7E5E4"/>
    <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="14" fill="#78716C">${truncatedText}</text>
  </svg>`;

  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
};

const ImageComponent = ({
  src,
  alt = 'Image',
  className = 'object-cover',
  width,
  height,
  fallbackSrc,
  placeholderText = null
}) => {
  const [imageError, setImageError] = useState(false);
  const [fallbackError, setFallbackError] = useState(false);

  const handleError = () => {
    if (!imageError) {
      setImageError(true);
    } else if (!fallbackError) {
      setFallbackError(true);
    }
  };

  const getImageSource = () => {
    const text = placeholderText || alt || 'Image';

    if (!imageError && src) {
      return src;
    }

    if (!fallbackError && fallbackSrc) {
      return fallbackSrc;
    }

    return generatePlaceholder(width, height, text);
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
