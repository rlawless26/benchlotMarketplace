// src/Pages/ToolDetailPage.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, 
  ChevronRight, 
  ArrowLeft, 
  Heart, 
  MapPin, 
  Star, 
  Check, 
  Loader, 
  AlertCircle
} from 'lucide-react';
import { getToolById } from '../firebase/models/toolModel';
import { useAuth } from '../firebase';
import ImageComponent from '../components/ImageComponent';
import AddToCartButton from '../components/AddToCartButton';
import SaveToolButton from '../components/SaveToolButton';
import MakeOfferModal from '../components/MakeOfferModal';

const ToolDetailPage = () => {
  const { id } = useParams();
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  // State variables
  const [tool, setTool] = useState(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showOfferModal, setShowOfferModal] = useState(false);
  
  // Contact seller
  const contactSeller = async () => {
    if (!isAuthenticated()) {
      navigate('/login', { state: { from: `/tools/${id}` } });
      return;
    }
    
    // Check if seller ID exists
    if (!tool?.sellerId) {
      console.error("Seller ID not found");
      return;
    }
    
    try {
      // Import useMessages hook functionality directly to avoid React hooks rules
      const { getOrCreateConversation, findConversationBetweenUsers } = await import('../firebase/models/messageModel');
      
      // Create conversation metadata with context about this tool
      const metadata = {
        topic: `About: ${tool.name}`,
        toolId: tool.id,
        toolName: tool.name,
        toolImage: tool.images?.[0]?.url || null,
        participantNames: {
          [user.uid]: user.displayName || 'You',
          [tool.sellerId]: tool.seller?.displayName || tool.seller?.username || 'Seller'
        }
      };
      
      // Check if conversation already exists
      let conversation = await findConversationBetweenUsers(user.uid, tool.sellerId);
      
      // If no conversation exists, create one
      if (!conversation) {
        conversation = await getOrCreateConversation(user.uid, tool.sellerId, metadata);
      }
      
      // Redirect to the conversation
      navigate(`/messages/conversation/${conversation.id}`);
    } catch (error) {
      console.error("Error creating conversation:", error);
      // Fallback to standard messages page
      navigate('/messages');
    }
  };
  
  // Make an offer
  const openOfferModal = () => {
    if (!isAuthenticated()) {
      navigate('/login', { state: { from: `/tools/${id}` } });
      return;
    }
    
    setShowOfferModal(true);
  };
  
  // Handle offer success
  const handleOfferSuccess = () => {
    setTimeout(() => {
      setShowOfferModal(false);
      // Could navigate to messages page
      navigate('/messages');
    }, 1500);
  };
  
  // Fetch tool data
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
    return isAuthenticated && user && tool && user.uid === tool.user_id;
  };

  // Toast notification for wishlist actions
  const handleWishlistAction = (added) => {
    // In a real implementation, you might want to use a toast notification library
    alert(added ? 'Added to wishlist' : 'Removed from wishlist');
  };

  // Navigate to previous image
  const prevImage = () => {
    if (tool?.images?.length > 0) {
      setActiveImageIndex((prev) =>
        prev === 0 ? tool.images.length - 1 : prev - 1
      );
    }
  };

  // Navigate to next image
  const nextImage = () => {
    if (tool?.images?.length > 0) {
      setActiveImageIndex((prev) =>
        prev === tool.images.length - 1 ? 0 : prev + 1
      );
    }
  };

  // If loading, show loading state
  if (loading) {
    return (
      <div className="bg-base min-h-screen">
        <main className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex justify-center items-center h-64">
            <Loader className="h-8 w-8 text-benchlot-primary animate-spin" />
            <span className="ml-2 text-stone-600">Loading tool details...</span>
          </div>
        </main>
      </div>
    );
  }

  // If error, show error state
  if (error) {
    return (
      <div className="bg-base min-h-screen">
        <main className="max-w-7xl mx-auto px-4 py-8">
          <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg mb-6">
            <div className="flex items-start">
              <AlertCircle className="h-6 w-6 mr-2 flex-shrink-0" />
              <div>
                <h3 className="font-medium text-lg mb-2">Error Loading Tool</h3>
                <p>{error}</p>
              </div>
            </div>
            <div className="mt-4">
              <button
                className="px-4 py-2 bg-benchlot-primary text-white rounded-md hover:bg-benchlot-secondary"
                onClick={() => navigate('/marketplace')}
              >
                Return to Marketplace
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // If no tool data, show not found state
  if (!tool) {
    return (
      <div className="bg-base min-h-screen">
        <main className="max-w-7xl mx-auto px-4 py-8">
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-6 py-4 rounded-lg mb-6">
            <div className="flex items-start">
              <AlertCircle className="h-6 w-6 mr-2 flex-shrink-0" />
              <div>
                <h3 className="font-medium text-lg mb-2">Tool Not Found</h3>
                <p>The tool you're looking for couldn't be found. It may have been removed or the URL might be incorrect.</p>
              </div>
            </div>
            <div className="mt-4">
              <button
                className="px-4 py-2 bg-benchlot-primary text-white rounded-md hover:bg-benchlot-secondary"
                onClick={() => navigate('/marketplace')}
              >
                Browse Available Tools
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Main content when tool is loaded successfully
  return (
    <div className={`${isOwner() ? 'bg-gray-100' : 'bg-stone-50'} min-h-screen`}>
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Breadcrumb navigation */}
        <div className="mb-6">
          <button
            className="flex items-center text-stone-600 hover:text-benchlot-primary"
            onClick={() => navigate('/marketplace')}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Marketplace
          </button>
        </div>

        {/* Main content grid - Updated proportions to match Reverb.com */}
        <div className="grid grid-cols-1 lg:grid-cols-9 gap-8">
          {/* Left column - Images (6/9 width on desktop) always first on mobile */}
          <div className="lg:col-span-6 space-y-4 order-1">
            {/* Main image */}
            <div className="bg-white rounded-lg overflow-hidden shadow-md relative aspect-square">
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

              {/* Image navigation arrows */}
              {tool.images && tool.images.length > 1 && (
                <>
                  <button
                    className="absolute top-1/2 left-2 transform -translate-y-1/2 bg-white bg-opacity-80 rounded-full p-2 shadow hover:bg-opacity-100"
                    onClick={prevImage}
                    aria-label="Previous image"
                  >
                    <ChevronLeft className="h-5 w-5 text-stone-700" />
                  </button>
                  <button
                    className="absolute top-1/2 right-2 transform -translate-y-1/2 bg-white bg-opacity-80 rounded-full p-2 shadow hover:bg-opacity-100"
                    onClick={nextImage}
                    aria-label="Next image"
                  >
                    <ChevronRight className="h-5 w-5 text-stone-700" />
                  </button>
                </>
              )}
              
              {/* Verified Badge */}
              {tool.verified && (
                <div className="absolute top-3 left-3 badge badge-success flex items-center">
                  <Check className="w-3 h-3 mr-1" />
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
            
            {/* Thumbnail images */}
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

          {/* Right column - Pricing, seller info, actions (3/9 width on desktop) - second on mobile */}
          <div className="space-y-4 order-2 lg:col-span-3">
            {/* Main info card */}
            <div className="bg-white rounded-lg p-6 shadow-md">
              <h1 className="text-2xl font-medium text-stone-800 mb-2">{tool.name}</h1>

              {/* Pricing */}
              <div className="mb-4">
                <div className="flex items-baseline">
                  <span className="text-2xl font-medium text-stone-800">
                    {formatPrice(tool.current_price)}
                  </span>
                  {tool.original_price && tool.original_price > tool.current_price && (
                    <span className="ml-2 text-sm text-stone-500 line-through">
                      {formatPrice(tool.original_price)}
                    </span>
                  )}
                </div>

                {tool.original_price && tool.original_price > tool.current_price && (
                  <span className="text-sm text-green-600">
                    You save {formatPrice(tool.original_price - tool.current_price)} ({Math.round((1 - tool.current_price / tool.original_price) * 100)}%)
                  </span>
                )}
              </div>

              {/* Location */}
              {tool.location && (
                <div className="flex items-center mb-4">
                  <MapPin className="h-4 w-4 text-stone-400 mr-2" />
                  <span className="text-stone-600">{tool.location}</span>
                </div>
              )}

              {/* Category & Condition Tags */}
              <div className="mb-6">
                {tool.category && (
                  <span className="inline-block bg-stone-100 text-stone-800 text-xs px-2 py-1 rounded mr-2 mb-2">
                    {tool.category}
                  </span>
                )}
                {tool.subcategory && (
                  <span className="inline-block bg-stone-100 text-stone-800 text-xs px-2 py-1 rounded mr-2 mb-2">
                    {tool.subcategory}
                  </span>
                )}
                {tool.condition && (
                  <span className="inline-block bg-stone-100 text-stone-800 text-xs px-2 py-1 rounded mb-2">
                    {tool.condition}
                  </span>
                )}
              </div>

              {/* Action buttons */}
              <div className="grid grid-cols-1 gap-3 mb-6">
                {/* If user is owner, show different actions */}
                {isOwner() ? (
                  <>
                    {/* Edit listing button */}
                    <button
                      onClick={() => navigate(`/tools/edit/${tool.id}`)}
                      className="w-full py-3 bg-benchlot-accent text-white rounded-md hover:bg-benchlot-accent-dark flex items-center justify-center font-medium"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit Listing
                    </button>
                    
                    {/* View all listings button */}
                    <button
                      onClick={() => navigate('/my-listings')}
                      className="w-full py-3 bg-white border border-stone-300 text-stone-700 rounded-md hover:bg-stone-50 flex items-center justify-center font-medium"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                      </svg>
                      My Listings
                    </button>
                  </>
                ) : (
                  <>
                    {/* Add to Cart button - with increased visibility */}
                    <button
                      onClick={() => {
                        const addToCartBtn = document.querySelector('[aria-label="Add this item to your cart"]');
                        if (addToCartBtn) addToCartBtn.click();
                      }}
                      className="w-full py-3 rounded-md font-semibold text-[96%] transition-colors bg-benchlot-primary text-white hover:bg-benchlot-secondary justify-center flex"
                    >
                      <svg className="w-5 h-5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path>
                      </svg>
                      Add to Cart
                    </button>
                    <div className="hidden">
                      <AddToCartButton 
                        tool={tool}
                        extraClasses="btn-primary w-full justify-center text-lg py-3"
                      />
                    </div>
                    
                    {/* Make offer button with consistent styling */}
                    <button
                      className="w-full py-3 rounded-md font-semibold text-[96%] transition-colors bg-stone-100 text-benchlot-text-primary border border-stone-200 justify-center flex hover:bg-stone-200"
                      onClick={openOfferModal}
                    >
                      Make an Offer
                    </button>
                    
                    <div className="flex w-full gap-3">
                      {/* Contact seller button - same style as Make Offer */}
                      <button
                        className="flex-1 py-3 rounded-md font-semibold text-[96%] transition-colors bg-stone-100 text-benchlot-text-primary border border-stone-200 justify-center flex hover:bg-stone-200"
                        onClick={contactSeller}
                      >
                        Contact Seller
                      </button>
                      
                      {/* Wishlist button - with consistent styling */}
                      <button
                        onClick={(e) => {
                          const wishlistBtn = document.querySelector('[aria-label="Watch this item"]');
                          if (wishlistBtn) wishlistBtn.click();
                        }}
                        className="flex-1 py-3 rounded-md font-semibold text-[96%] transition-colors bg-stone-100 text-benchlot-text-primary border border-stone-200 justify-center flex hover:bg-stone-200 items-center"
                      >
                        <Heart className="h-4 w-4 mr-1.5" />
                        Watch
                      </button>
                      <div className="hidden">
                        <SaveToolButton
                          toolId={tool.id}
                          variant="outline"
                          showText={true}
                          size="small"
                          className="flex-1 py-3 rounded-md font-semibold transition-colors"
                          onSaveSuccess={(isInWishlist) => handleWishlistAction(isInWishlist)}
                          onSaveError={(error) => alert(`Error: ${error}`)}
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
            
            {/* "Sell one like this" CTA - desktop only */}
            {!isOwner() && (
              <div className="bg-emerald-800/80 rounded-lg p-5 shadow-md hidden lg:block">
                <div className="flex items-center">
                  <div className="flex-shrink-0 mr-4">
                    <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-grow">
                    <h3 className="text-md font-medium text-white">Want to sell yours?</h3>
                    <p className="text-sm text-white text-opacity-90 mb-3">List a tool like this one and start earning.</p>
                    <button 
                      onClick={() => navigate('/sell')}
                      className="inline-flex items-center py-2 px-4 bg-white rounded-md text-sm font-medium text-emerald-800 hover:bg-opacity-90 transition-colors"
                    >
                      Sell one like this
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Description section - will appear after image and info/button sections on mobile */}
          <div className="lg:col-span-9 order-3">
            <div className="bg-white rounded-lg p-6 shadow-md">
              <h2 className="text-lg font-medium text-stone-800 mb-4">Description</h2>
              <p className="text-stone-600 whitespace-pre-line">{tool.description || "No description provided."}</p>
            </div>
          </div>

          {/* Specifications section - will appear fourth on mobile */}
          <div className="lg:col-span-9 order-4">
            <div className="bg-white rounded-lg p-6 shadow-md">
              <h2 className="text-lg font-medium text-stone-800 mb-4">Specifications</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {tool.brand && (
                  <div>
                    <dt className="text-sm text-stone-500">Brand</dt>
                    <dd className="text-stone-800">{tool.brand}</dd>
                  </div>
                )}
                {tool.model && (
                  <div>
                    <dt className="text-sm text-stone-500">Model</dt>
                    <dd className="text-stone-800">{tool.model}</dd>
                  </div>
                )}
                {tool.condition && (
                  <div>
                    <dt className="text-sm text-stone-500">Condition</dt>
                    <dd className="text-stone-800">{tool.condition}</dd>
                  </div>
                )}
                {tool.age && (
                  <div>
                    <dt className="text-sm text-stone-500">Age</dt>
                    <dd className="text-stone-800">{tool.age}</dd>
                  </div>
                )}
                {tool.material && (
                  <div>
                    <dt className="text-sm text-stone-500">Material</dt>
                    <dd className="text-stone-800">{tool.material}</dd>
                  </div>
                )}
                {tool.dimensions && (
                  <div>
                    <dt className="text-sm text-stone-500">Dimensions</dt>
                    <dd className="text-stone-800">{tool.dimensions}</dd>
                  </div>
                )}
                {tool.category && (
                  <div>
                    <dt className="text-sm text-stone-500">Category</dt>
                    <dd className="text-stone-800">{tool.category}</dd>
                  </div>
                )}
                {tool.created_at && (
                  <div>
                    <dt className="text-sm text-stone-500">Listed</dt>
                    <dd className="text-stone-800">
                      {tool.created_at.seconds ? 
                        new Date(tool.created_at.seconds * 1000).toLocaleDateString() :
                        new Date(tool.created_at).toLocaleDateString()}
                    </dd>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Seller info - moved to the end */}
          {tool.seller && (
            <div className="lg:col-span-9 order-5">
              <div className="bg-white rounded-lg p-6 shadow-md">
                <h2 className="text-lg font-medium text-stone-800 mb-4">About the Seller</h2>
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-stone-200 rounded-full overflow-hidden mr-3 flex items-center justify-center">
                    {tool.seller.avatar_url ? (
                      <img
                        src={tool.seller.avatar_url}
                        alt={`${tool.seller.username || 'Seller'}'s avatar`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.style.display = 'none';
                          e.target.parentNode.innerHTML = `<div class="w-full h-full flex items-center justify-center text-stone-500 font-medium">${(tool.seller.username || 'S').charAt(0).toUpperCase()}</div>`;
                        }}
                      />
                    ) : (
                      <div className="text-stone-500 font-medium text-xl">
                        {(tool.seller.username || 'S').charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="font-medium text-stone-800">
                      {tool.seller.username || tool.seller.displayName || 'Anonymous Seller'}
                    </h3>
                    {tool.seller.rating && (
                      <div className="flex items-center">
                        <Star className="h-3 w-3 text-yellow-500 mr-1" fill="#EAB308" />
                        <span className="text-sm text-stone-600">
                          {tool.seller.rating.toFixed(1)} ({tool.seller.rating_count || 0} reviews)
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                {tool.seller.location && (
                  <div className="flex items-center text-sm text-stone-600 mb-4">
                    <MapPin className="h-4 w-4 text-stone-400 mr-2" />
                    <span>{tool.seller.location}</span>
                  </div>
                )}
                <button
                  className="w-full py-2 bg-white border border-stone-300 text-stone-700 rounded-md hover:bg-stone-50 text-sm"
                  onClick={() => navigate(`/profile/${tool.seller.id}`)}
                >
                  View Profile
                </button>
              </div>
            </div>
          )}
          
          {/* "Sell one like this" CTA - mobile only, at the very bottom */}
          {!isOwner() && (
            <div className="lg:hidden lg:col-span-9 order-6 mt-4">
              <div className="bg-emerald-800/80 rounded-lg p-5 shadow-md">
                <div className="flex items-center">
                  <div className="flex-shrink-0 mr-4">
                    <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-grow">
                    <h3 className="text-md font-medium text-white">Want to sell yours?</h3>
                    <p className="text-sm text-white text-opacity-90 mb-3">List a tool like this one and start earning.</p>
                    <button 
                      onClick={() => navigate('/sell')}
                      className="inline-flex items-center py-2 px-4 bg-white rounded-md text-sm font-medium text-emerald-800 hover:bg-opacity-90 transition-colors"
                    >
                      Sell one like this
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
      
      {/* Offer Modal */}
      <MakeOfferModal
        isOpen={showOfferModal}
        onClose={() => setShowOfferModal(false)}
        tool={tool}
        onSuccess={handleOfferSuccess}
      />
    </div>
  );
};

export default ToolDetailPage;