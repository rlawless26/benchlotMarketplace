/**
 * Tool Listing Card Component
 * Displays a tool listing in card format with Benchlot styling.
 *
 * Two modes:
 *   - Internal (legacy marketplace): links to /tools/:id and shows
 *     save-to-wishlist + location + seller rating.
 *   - External (aggregator): tool.external === true. Links out to
 *     tool.source_url in a new tab, shows the source name instead of
 *     seller info, no wishlist button.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import posthog from 'posthog-js';
import ToolImage from './ToolImage';
import SaveToolButton from './SaveToolButton';

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

  const isExternal = tool.external === true;

  const handleExternalClick = () => {
    posthog.capture('listing_click', {
      toolId: tool.id,
      toolName: tool.name,
      source: tool.source || tool.sourceName,
      price: displayPrice,
      category: tool.category,
    });
  };

  // Wrapper for the image + title area. Internal tools navigate within the
  // app; external tools open the source listing in a new tab.
  const MediaLink = ({ children, className }) =>
    isExternal ? (
      <a
        href={tool.source_url}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        onClick={handleExternalClick}
      >
        {children}
      </a>
    ) : (
      <Link to={`/tools/${tool.id}`} className={className}>
        {children}
      </Link>
    );

  return (
    <div
      className={`
        bg-bone-light rounded-lg overflow-hidden shadow-card hover:shadow-card-hover
        transition-all duration-200 flex flex-col h-full relative
        ${featured ? 'ring-2 ring-spruce' : 'border border-default'}
      `}
    >
      {/* Featured badge */}
      {featured && (
        <div className="absolute top-2 right-12 z-10 bg-spruce text-bone px-2.5 py-1 text-xs font-medium rounded-full shadow-sm">
          Featured
        </div>
      )}

      {/* Tool image container */}
      <MediaLink className="relative block aspect-[4/3] overflow-hidden bg-gray-100">
        <ToolImage
          tool={tool}
          index={0}
          className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
        />

        {/* Verified badge (internal only) */}
        {!isExternal && tool.verified && (
          <div className="absolute top-2 left-2 z-10 bg-green-600 text-white px-2.5 py-1 text-xs font-medium rounded-full shadow-sm">
            <span className="mr-0.5">✓</span> Verified
          </div>
        )}

        {/* Save to wishlist — internal listings only. External listings
            don't have an internal detail page to wishlist against. */}
        {!isExternal && (
          <div className="absolute top-2 right-2 z-10">
            <SaveToolButton
              toolId={tool.id}
              iconOnly={true}
              size="small"
              variant="filled"
            />
          </div>
        )}
      </MediaLink>

      {/* Tool details */}
      <div className="p-4 flex flex-col flex-grow">
        <MediaLink className="text-lg font-display font-bold text-dark-teal hover:text-spruce transition-colors duration-150 mb-1 line-clamp-2">
          {tool.name}
        </MediaLink>

        <div className="mt-1 space-y-2 mb-3">
          {tool.category && (
            <div className="inline-block bg-bone-dark text-spruce text-xs font-medium px-2.5 py-1 rounded-full">
              {tool.category}
            </div>
          )}

          <div className="flex flex-wrap gap-x-4 text-sm text-secondary">
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
            <span className="text-xl font-bold text-honey">
              {formatPrice(displayPrice)}
            </span>
            {tool.rental_period && (
              <span className="ml-1 text-xs text-secondary">
                /{tool.rental_period}
              </span>
            )}
          </div>
        </div>

        {/* Bottom row: source (external) or location/seller (internal) */}
        {isExternal ? (
          <div className="mt-3 pt-3 border-t border-default text-sm text-secondary flex items-center justify-between">
            <span className="flex items-center">
              <span className="text-xs uppercase tracking-wide text-spruce/70 mr-2">via</span>
              <span className="font-medium text-dark-teal">{tool.sourceName || 'External source'}</span>
            </span>
            <a
              href={tool.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-spruce hover:text-honey transition-colors text-xs font-medium"
              onClick={handleExternalClick}
            >
              View listing
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        ) : (
          <div className="mt-3 pt-3 border-t border-default text-sm text-secondary flex flex-wrap items-center justify-between">
            <div>
              {tool.location && (
                <span className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1 text-spruce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
        )}
      </div>
    </div>
  );
};

export default ToolListingCard;
