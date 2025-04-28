// src/Pages/ToolDetailPage.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { 
  ChevronLeft, 
  ChevronRight, 
  ArrowLeft, 
  Heart, 
  MapPin, 
  Star, 
  Check, 
  Loader, 
  AlertCircle,
  Truck,
  ExternalLink,
  MessageCircle
} from 'lucide-react';
import { 
  getToolById, 
  toolStatus, 
  uploadToolImage, 
  getActiveTools,
  conditionDefinitions 
} from '../firebase/models/toolModel';
import { useAuth } from '../firebase';
import { getUserById } from '../firebase/models/userModel';
import ImageComponent from '../components/ImageComponent';
import AddToCartButton from '../components/AddToCartButton';
import SaveToolButton from '../components/SaveToolButton';
import MakeOfferModal from '../components/MakeOfferModal';
import { openAuthModal } from '../utils/featureFlags';

const ToolDetailPage = () => {
  const { id } = useParams();
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // State variables
  const [tool, setTool] = useState(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [similarTools, setSimilarTools] = useState([]);
  const [recentlyViewed, setRecentlyViewed] = useState([]);
  
  // Photo upload state
  const [showPhotoUploader, setShowPhotoUploader] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState(null);
  const [photoSuccess, setPhotoSuccess] = useState(false);
  
  // Get action from URL params (e.g., ?action=add-photos)
  const params = new URLSearchParams(location.search);
  const action = params.get('action');
  
  // Contact seller
  const contactSeller = async () => {
    if (!isAuthenticated()) {
      openAuthModal('signin', `/tools/${id}`);
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
      openAuthModal('signin', `/tools/${id}`);
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
  
  // Fetch similar tools (same category)
  const fetchSimilarTools = async () => {
    if (!tool || !tool.category || !tool.id) {
      console.log("Tool data not complete for similar tools:", { 
        toolExists: !!tool, 
        category: tool?.category, 
        id: tool?.id 
      });
      return;
    }
    
    console.log(`Fetching similar tools for category: ${tool.category}`);
    
    try {
      const { tools } = await getActiveTools({
        category: tool.category,
        limitCount: 8  // Get more to account for filtering
      });
      
      console.log(`Found ${tools.length} tools in category ${tool.category}`);
      
      // Filter out the current tool
      const filteredTools = tools.filter(similarTool => similarTool.id !== tool.id);
      console.log(`After filtering current tool, ${filteredTools.length} similar tools remain`);
      
      // Only keep 4 items maximum
      const limitedTools = filteredTools.slice(0, 4);
      console.log(`Setting ${limitedTools.length} similar tools`);
      
      setSimilarTools(limitedTools);
    } catch (error) {
      console.error('Error fetching similar tools:', error);
    }
  };
  
  // Track recently viewed items
  useEffect(() => {
    if (tool?.id) {
      // Get existing recently viewed items
      const storedItems = localStorage.getItem('recentlyViewedTools');
      let recentItems = storedItems ? JSON.parse(storedItems) : [];
      
      // Remove the current item if it exists
      recentItems = recentItems.filter(id => id !== tool.id);
      
      // Add current item to the beginning
      recentItems.unshift(tool.id);
      
      // Keep only the last 20 items
      recentItems = recentItems.slice(0, 20);
      
      // Save back to localStorage
      localStorage.setItem('recentlyViewedTools', JSON.stringify(recentItems));
    }
  }, [tool?.id]);
  
  // Load recently viewed items
  const loadRecentlyViewed = async () => {
    // Return early if tool isn't loaded yet
    if (!tool || !tool.id) return;
    
    console.log("Loading recently viewed items...");
    const storedItems = localStorage.getItem('recentlyViewedTools');
    console.log("Stored items from localStorage:", storedItems);
    
    if (storedItems) {
      try {
        const itemIds = JSON.parse(storedItems);
        console.log("Parsed item IDs:", itemIds);
        
        // Filter out the current tool ID
        const filteredIds = itemIds.filter(id => id !== tool.id);
        console.log("Filtered IDs (without current tool):", filteredIds);
        
        if (filteredIds.length === 0) {
          console.log("No other tools have been viewed");
          return;
        }
        
        const tools = [];
        
        // Load tool data for each ID (limited to first 6 that aren't current tool)
        let count = 0;
        for (const id of filteredIds) {
          try {
            console.log(`Fetching tool with ID: ${id}`);
            const toolData = await getToolById(id);
            console.log(`Successfully loaded tool: ${toolData.name}`);
            tools.push(toolData);
            count++;
            if (count >= 6) break; // Limit to 6 items
          } catch (err) {
            console.error(`Error loading recently viewed tool with ID ${id}:`, err);
          }
        }
        
        console.log(`Setting ${tools.length} recently viewed tools`);
        setRecentlyViewed(tools);
      } catch (parseError) {
        console.error("Error parsing stored items:", parseError);
        // If there's an error parsing, reset the localStorage
        localStorage.setItem('recentlyViewedTools', JSON.stringify([]));
      }
    } else {
      console.log("No recently viewed tools in localStorage");
    }
  };
  
  // Fetch tool data
  // Handle photo upload
  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Validate file type is image
    if (!file.type.startsWith('image/')) {
      setPhotoError('Please select an image file (jpg, png, etc)');
      return;
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setPhotoError('Image file size must be under 5MB');
      return;
    }
    
    setUploadingPhoto(true);
    setPhotoError(null);
    
    try {
      // Upload the image
      await uploadToolImage(file, id);
      
      // Refresh the tool data to show the new image
      const updatedTool = await getToolById(id);
      setTool(updatedTool);
      
      // Show success message
      setPhotoSuccess(true);
      setTimeout(() => setPhotoSuccess(false), 3000);
      
      // Clear the file input
      e.target.value = '';
    } catch (error) {
      console.error('Error uploading photo:', error);
      setPhotoError('Failed to upload photo. Please try again.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Show photo uploader if action=add-photos or the tool needs images
  useEffect(() => {
    if (action === 'add-photos') {
      setShowPhotoUploader(true);
    } else if (tool && tool.status === toolStatus.PENDING_IMAGES && isOwner()) {
      // Also show for owner of a listing that needs images
      setShowPhotoUploader(true);
    }
  }, [action, tool, user]);
  
  // Load tool data
  useEffect(() => {
    const loadTool = async () => {
      try {
        setLoading(true);
        const toolData = await getToolById(id);
        
        // If there's no seller data but we have a user_id, fetch the user details
        if (toolData && !toolData.seller && toolData.user_id) {
          try {
            console.log("Fetching seller data using user_id:", toolData.user_id);
            const userData = await getUserById(toolData.user_id);
            
            // Attach seller data to the tool
            toolData.seller = userData;
            console.log("Added seller data to tool:", userData);
          } catch (userErr) {
            console.error("Error fetching seller data:", userErr);
          }
        }
        
        setTool(toolData);
        setError(null);
        
        // After loading tool data successfully, fetch related data
        if (toolData) {
          // Fetch similar tools after loading the tool data
          setTimeout(() => {
            fetchSimilarTools();
            // Now that tool data is set, we can safely load recently viewed
            loadRecentlyViewed();
          }, 100);
        }
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
        {/* Photo uploader banner for listing that needs images */}
        {showPhotoUploader && isOwner() && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between">
              <div className="mb-4 md:mb-0">
                <h3 className="text-blue-800 font-medium text-lg mb-1">
                  {tool.images && tool.images.length > 0 
                    ? 'Add more photos to increase visibility' 
                    : 'Your listing needs photos to be visible to buyers'}
                </h3>
                <p className="text-blue-600">
                  {tool.images && tool.images.length > 0 
                    ? 'Tools with multiple photos sell 3X faster!' 
                    : 'Upload at least one photo to activate your listing'}
                </p>
                
                {/* Status indicator */}
                <div className="mt-2 text-sm">
                  <span className="font-medium">Status: </span>
                  {tool.status === toolStatus.PENDING_IMAGES ? (
                    <span className="text-amber-600 font-medium">Draft - Needs photos</span>
                  ) : (
                    <span className="text-green-600 font-medium">Active - Visible to buyers</span>
                  )}
                </div>
              </div>
              
              <div>
                <label className="block">
                  <span className="sr-only">Choose photos</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    disabled={uploadingPhoto}
                    className="block w-full text-sm text-gray-500
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-md file:border-0
                      file:text-sm file:font-medium
                      file:bg-blue-600 file:text-white
                      hover:file:bg-blue-700
                      file:cursor-pointer file:shadow"
                  />
                </label>
                
                {/* Success message */}
                {photoSuccess && (
                  <p className="mt-2 text-green-600 text-sm flex items-center">
                    <Check className="h-4 w-4 mr-1" />
                    Photo uploaded successfully!
                  </p>
                )}
                
                {/* Error message */}
                {photoError && (
                  <p className="mt-2 text-red-600 text-sm flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {photoError}
                  </p>
                )}
                
                {/* Loading indicator */}
                {uploadingPhoto && (
                  <p className="mt-2 text-blue-600 text-sm flex items-center">
                    <Loader className="h-4 w-4 mr-1 animate-spin" />
                    Uploading photo...
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* Breadcrumb navigation */}
        <div className="mb-6">
          <nav className="flex mb-4 text-sm text-stone-600">
            <Link to="/" className="hover:text-benchlot-primary">Home</Link>
            <span className="mx-2">/</span>
            <Link to="/marketplace" className="hover:text-benchlot-primary">Marketplace</Link>
            <span className="mx-2">/</span>
            {tool.category && (
              <>
                <Link to={`/marketplace?category=${encodeURIComponent(tool.category)}`} className="hover:text-benchlot-primary">
                  {tool.category}
                </Link>
                <span className="mx-2">/</span>
              </>
            )}
            <span className="text-stone-800 font-medium truncate">{tool.name}</span>
          </nav>
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
              
              {/* Shipping Information */}
              <div className="mt-4 p-3 bg-stone-50 rounded-lg border border-stone-200 mb-4">
                <div className="flex flex-col space-y-2">
                  {/* Shipping Price */}
                  <div className="flex items-center">
                    {tool.free_shipping ? (
                      <span className="inline-flex items-center text-green-600 font-medium">
                        <Truck className="h-4 w-4 mr-1" />
                        Free Shipping
                      </span>
                    ) : (
                      <>
                        <Truck className="h-4 w-4 mr-1 text-stone-500" />
                        <span className="text-stone-700">
                          Shipping: {formatPrice(tool.shipping_price || 0)}
                        </span>
                      </>
                    )}
                  </div>
                  
                  {/* Shipping Location - drawn from seller's city/state or tool shipping_location */}
                  <div className="flex items-center text-sm text-stone-600">
                    <MapPin className="h-3.5 w-3.5 mr-1 text-stone-400" />
                    <span>
                      Ships from: {
                        tool.shipping_location || 
                        (tool.seller && tool.seller.businessCity && tool.seller.businessState ? 
                          `${tool.seller.businessCity}, ${tool.seller.businessState}` : 
                          "Location not specified")
                      }
                    </span>
                  </div>
                </div>
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
                {/* Category Tags - Blue background */}
                {tool.category && (
                  <span className="inline-block bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded mr-2 mb-2">
                    {tool.category}
                  </span>
                )}
                {tool.subcategory && (
                  <span className="inline-block bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded mr-2 mb-2">
                    {tool.subcategory}
                  </span>
                )}
                {/* Condition Tag - Different color scheme to stand out */}
                {tool.condition && (
                  <span className={`inline-block text-xs px-2 py-1 rounded mb-2 ${
                    tool.condition === 'New' ? 'bg-green-50 text-green-700' :
                    tool.condition === 'Like New' ? 'bg-emerald-50 text-emerald-700' :
                    tool.condition === 'Good' ? 'bg-yellow-50 text-yellow-700' :
                    tool.condition === 'Fair' ? 'bg-orange-50 text-orange-700' :
                    tool.condition === 'Poor' ? 'bg-red-50 text-red-700' :
                    tool.condition === 'Not Functioning' ? 'bg-gray-50 text-gray-700' :
                    'bg-stone-100 text-stone-800'
                  }`}>
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
                    <dd className="text-stone-800">
                      {tool.condition}
                      {conditionDefinitions[tool.condition] && (
                        <p className="mt-1 text-xs text-stone-500 italic">
                          {conditionDefinitions[tool.condition]}
                        </p>
                      )}
                    </dd>
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
                      {(() => {
                        const createdDate = tool.created_at.seconds 
                          ? new Date(tool.created_at.seconds * 1000)
                          : new Date(tool.created_at);
                        const today = new Date();
                        const diffTime = Math.abs(today - createdDate);
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
                      })()}
                    </dd>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* About the Seller section with expanded features */}
          {/* The condition below was expanded to check for user_id as an alternative */}
          {(tool.seller || tool.user_id) && (
            <div className="lg:col-span-9 order-5 mt-6">
              <div className="bg-white rounded-lg p-6 shadow-md">
                <h2 className="text-xl font-medium text-stone-800 mb-4">About the Seller</h2>
                
                {/* Debug output to see what seller data we have - set to visible */}
                {process.env.NODE_ENV === 'development' && (
                  <div className="mb-4 p-2 bg-gray-100 text-xs overflow-auto max-h-32">
                    <p>Seller Data: {JSON.stringify(tool.seller || {})}</p>
                    <p>User ID: {tool.user_id}</p>
                    <p>Seller ID: {tool.sellerId}</p>
                  </div>
                )}
                
                {/* Seller Profile */}
                {/* Basic seller info section - shown even if seller data is minimal */}
                <div className="flex flex-wrap md:flex-nowrap border-b border-stone-200 pb-6 mb-6">
                  <div className="w-full md:w-1/3 mb-4 md:mb-0">
                    <div className="flex items-center">
                      {/* Profile Image/Avatar */}
                      <div className="w-16 h-16 bg-stone-200 rounded-full overflow-hidden mr-4 flex items-center justify-center">
                        {tool.seller && (tool.seller.photoURL || tool.seller.avatar_url) ? (
                          <img
                            src={tool.seller.photoURL || tool.seller.avatar_url}
                            alt={`${tool.seller && (tool.seller.displayName || tool.seller.username) || 'Seller'}'s profile`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.style.display = 'none';
                              e.target.parentNode.innerHTML = `<div class="w-full h-full flex items-center justify-center text-stone-500 font-medium">S</div>`;
                            }}
                          />
                        ) : (
                          <div className="text-stone-500 font-medium text-xl">
                            S
                          </div>
                        )}
                      </div>
                      
                      {/* Seller Info */}
                      <div>
                        <h3 className="font-medium text-stone-800 text-lg">
                          {tool.seller && (tool.seller.businessName || tool.seller.displayName || tool.seller.username) || "Seller"}
                        </h3>
                        
                        {/* City/State - Always display, even if missing in seller data */}
                        <div className="flex items-center text-sm text-stone-600 mt-1">
                          <MapPin className="h-3.5 w-3.5 text-stone-400 mr-1" />
                          <span>
                            {tool.seller && tool.seller.businessCity && tool.seller.businessState ? 
                              `${tool.seller.businessCity}, ${tool.seller.businessState}` :
                              (tool.shipping_location || "Location not specified")
                            }
                          </span>
                        </div>
                        
                        {/* Rating */}
                        {tool.seller && tool.seller.rating && (
                          <div className="flex items-center mt-1">
                            <Star className="h-3.5 w-3.5 text-yellow-500 mr-1" fill="#EAB308" />
                            <span className="text-sm text-stone-600">
                              {tool.seller.rating.toFixed(1)} ({tool.seller.rating_count || 0} reviews)
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Right side of seller profile with description and actions */}
                  <div className="w-full md:w-2/3 md:pl-6">
                    {tool.seller && tool.seller.businessDescription && (
                      <p className="text-stone-600 text-sm mb-4">{tool.seller.businessDescription}</p>
                    )}
                    
                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={contactSeller}
                        className="inline-flex items-center px-4 py-2 border border-benchlot-primary text-sm font-medium rounded-md text-benchlot-primary hover:bg-benchlot-accent-light"
                      >
                        <MessageCircle className="h-4 w-4 mr-1" />
                        Contact Seller
                      </button>
                      <Link
                        to={`/marketplace?seller=${tool.seller_id || tool.user_id}`}
                        className="inline-flex items-center px-4 py-2 border border-stone-300 text-sm font-medium rounded-md text-stone-700 hover:bg-stone-50"
                      >
                        More from this Seller
                      </Link>
                    </div>
                  </div>
                </div>
                
                {/* Shipping and Returns */}
                <div className="border-b border-stone-200 pb-6 mb-6">
                  <h3 className="text-lg font-medium text-stone-800 mb-3">Shipping and Returns</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-medium text-stone-700 mb-1">Shipping</h4>
                      <p className="text-sm text-stone-600">
                        {tool.free_shipping ? (
                          "Free shipping included with this purchase!"
                        ) : (
                          <>Shipping cost: {formatPrice(tool.shipping_price || 0)}</>
                        )}
                        {tool.seller && tool.seller.policies && tool.seller.policies.shipping && tool.seller.policies.shipping.processingTime && (
                          <> • Ships within {tool.seller.policies.shipping.processingTime} business days</>
                        )}
                        {tool.shipping_location && (
                          <> • Ships from {tool.shipping_location}</>
                        )}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-stone-700 mb-1">Returns</h4>
                      <p className="text-sm text-stone-600">
                        {tool.seller && tool.seller.policies && tool.seller.policies.returns && tool.seller.policies.returns.acceptsReturns ? (
                          <>
                            Returns accepted within {tool.seller.policies.returns.returnPeriod || 14} days
                            {tool.seller.policies.returns.restockingFee > 0 && (
                              <> • {tool.seller.policies.returns.restockingFee}% restocking fee</>
                            )}
                          </>
                        ) : (
                          "All sales are final, no returns accepted"
                        )}
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Seller Reviews - Stubbed out for now */}
                <div>
                  <h3 className="text-lg font-medium text-stone-800 mb-3">Seller Reviews</h3>
                  <div className="bg-stone-50 border border-stone-200 rounded-md p-4 text-center">
                    <p className="text-stone-600 text-sm">
                      Reviews for this seller will be available soon.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* More Like This section */}
          <div className="lg:col-span-9 order-6 mt-6">
            <div className="bg-white rounded-lg p-6 shadow-md">
              <h2 className="text-xl font-medium text-stone-800 mb-4">More Like This</h2>
              
              {similarTools.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {similarTools.map(similarTool => (
                    <div key={similarTool.id} className="bg-white rounded-lg overflow-hidden shadow-md border border-gray-100 hover:shadow-lg transition-shadow">
                      <Link to={`/tools/${similarTool.id}`} className="block">
                        <div className="aspect-square overflow-hidden bg-gray-100">
                          {similarTool.images && similarTool.images.length > 0 ? (
                            <img
                              src={similarTool.images[0].url}
                              alt={similarTool.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              No Image
                            </div>
                          )}
                        </div>
                        <div className="p-3">
                          <h3 className="text-stone-800 font-medium truncate">{similarTool.name}</h3>
                          <p className="text-benchlot-primary font-medium mt-1">
                            {formatPrice(similarTool.current_price || similarTool.price || 0)}
                          </p>
                        </div>
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-stone-50 border border-stone-200 rounded-md p-4 text-center">
                  <p className="text-stone-600">
                    No similar tools found at the moment.
                  </p>
                </div>
              )}
            </div>
          </div>
          
          {/* Recently Viewed section */}
          <div className="lg:col-span-9 order-7 mt-6">
            <div className="bg-white rounded-lg p-6 shadow-md">
              <h2 className="text-xl font-medium text-stone-800 mb-4">Recently Viewed</h2>
              
              {/* Debug info */}
              {process.env.NODE_ENV === 'development' && (
                <div className="mb-4 p-2 bg-gray-100 text-xs overflow-auto max-h-32">
                  <p>Recently Viewed Count: {recentlyViewed.length}</p>
                  <p>Local Storage Key: {localStorage.getItem('recentlyViewedTools') ? 'Exists' : 'Missing'}</p>
                </div>
              )}
              
              {recentlyViewed.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {recentlyViewed.map(viewedTool => (
                    <div key={viewedTool.id} className="bg-white rounded-lg overflow-hidden shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                      <Link to={`/tools/${viewedTool.id}`} className="block">
                        <div className="aspect-square overflow-hidden bg-gray-100">
                          {viewedTool.images && viewedTool.images.length > 0 ? (
                            <img
                              src={viewedTool.images[0].url}
                              alt={viewedTool.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              No Image
                            </div>
                          )}
                        </div>
                        <div className="p-2">
                          <h3 className="text-stone-800 text-sm truncate">{viewedTool.name}</h3>
                          <p className="text-benchlot-primary text-sm font-medium mt-0.5">
                            {formatPrice(viewedTool.current_price || viewedTool.price || 0)}
                          </p>
                        </div>
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-stone-50 border border-stone-200 rounded-md p-4 text-center">
                  <p className="text-stone-600">
                    No recently viewed items found. Browse more tools to see them here!
                  </p>
                </div>
              )}
            </div>
          </div>
          
          {/* "Sell one like this" CTA - mobile only, at the very bottom */}
          {!isOwner() && (
            <div className="lg:hidden lg:col-span-9 order-8 mt-4">
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