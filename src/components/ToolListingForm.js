/**
 * Tool Listing Form Component
 * Create or edit tool listings
 */
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../firebase';
import { 
  createTool, 
  updateTool, 
  getToolById,
  uploadToolImage, 
  deleteToolImage,
  toolCategories,
  toolConditions
} from '../firebase/models/toolModel';
import { getUserById } from '../firebase/models/userModel';
import { openAuthModal } from '../utils/featureFlags';

const ToolListingForm = ({ hideTitle = false }) => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams(); // For editing existing tools
  const isEditMode = !!id;

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    condition: '',
    brand: '',
    model: '',
    current_price: '',
    original_price: '',
    location: '',
    dimensions: '',
    material: '',
    age: '',
    shipping: {
      useDefault: true,
      methods: [],
      price: '',
      offersFreeShipping: false,
      freeShippingThreshold: '',
      offerLocalPickup: false
    },
    returns: {
      useDefault: true,
      acceptsReturns: false,
      returnPeriod: 14,
      conditions: ''
    }
  });

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [existingImages, setExistingImages] = useState([]);
  const [imagesToDelete, setImagesToDelete] = useState([]);
  const [sellerDefaults, setSellerDefaults] = useState({
    shipping: {
      methods: ['standard'],
      price: 15,
      offersFreeShipping: false,
      freeShippingThreshold: 100,
      offerLocalPickup: true
    },
    returns: {
      acceptsReturns: true,
      returnPeriod: 14,
      conditions: ''
    }
  });

  // Load seller's default settings
  useEffect(() => {
    const loadSellerDefaults = async () => {
      if (user && user.uid) {
        try {
          const userData = await getUserById(user.uid);
          if (userData) {
            const sellerProfile = userData.seller || userData.profile?.seller || {};
            const policies = sellerProfile.policies || {};
            
            if (policies.shipping) {
              setSellerDefaults(prev => ({
                ...prev,
                shipping: {
                  ...prev.shipping,
                  ...policies.shipping,
                  price: policies.shipping.defaultShippingPrice || prev.shipping.price
                }
              }));
            }
            
            if (policies.returns) {
              setSellerDefaults(prev => ({
                ...prev,
                returns: {
                  ...prev.returns,
                  ...policies.returns
                }
              }));
            }
          }
        } catch (err) {
          console.error("Couldn't load seller defaults:", err);
        }
      }
    };
    
    if (isAuthenticated()) {
      loadSellerDefaults();
    }
  }, [user, isAuthenticated]);

  // Load existing tool data if in edit mode
  useEffect(() => {
    const loadTool = async () => {
      if (isEditMode) {
        setLoading(true);
        try {
          const toolData = await getToolById(id);
          
          // Format price values for form
          const formattedToolData = {
            ...toolData,
            current_price: toolData.current_price ? toolData.current_price.toString() : '',
            original_price: toolData.original_price ? toolData.original_price.toString() : '',
            // Ensure shipping and returns data exist
            shipping: {
              useDefault: !toolData.shipping || toolData.shipping.useDefault !== false,
              methods: toolData.shipping?.methods || [],
              price: toolData.shipping?.price ? toolData.shipping.price.toString() : '',
              offersFreeShipping: toolData.shipping?.offersFreeShipping || false,
              freeShippingThreshold: toolData.shipping?.freeShippingThreshold ? 
                toolData.shipping.freeShippingThreshold.toString() : '',
              offerLocalPickup: toolData.shipping?.offerLocalPickup || false
            },
            returns: {
              useDefault: !toolData.returns || toolData.returns.useDefault !== false,
              acceptsReturns: toolData.returns?.acceptsReturns || false,
              returnPeriod: toolData.returns?.returnPeriod || 14,
              conditions: toolData.returns?.conditions || ''
            }
          };
          
          setFormData(formattedToolData);
          
          if (toolData.images && toolData.images.length > 0) {
            setExistingImages(toolData.images);
          }
        } catch (err) {
          setError("Couldn't load tool data. Please try again.");
          console.error(err);
        } finally {
          setLoading(false);
        }
      }
    };

    if (isAuthenticated()) {
      loadTool();
    } else {
      // Open auth modal if not authenticated
      openAuthModal('signin', `/tools/${isEditMode ? 'edit/' + id : 'new'}`);
    }
  }, [isEditMode, id, isAuthenticated, navigate]);

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  // Handle nested form changes
  const handleNestedChange = (section, field, value) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };
  
  // Handle checkbox for shipping methods
  const handleShippingMethodChange = (method) => {
    const currentMethods = formData.shipping.methods || [];
    let updatedMethods;
    
    if (currentMethods.includes(method)) {
      updatedMethods = currentMethods.filter(m => m !== method);
    } else {
      updatedMethods = [...currentMethods, method];
    }
    
    handleNestedChange('shipping', 'methods', updatedMethods);
  };
  
  // Toggle using default settings
  const handleUseDefaultToggle = (section) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        useDefault: !prev[section].useDefault
      }
    }));
  };

  // Handle image selection
  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files);
    
    // Validate file type and size
    const validFiles = files.filter(file => {
      // Check if it's an image
      if (!file.type.startsWith('image/')) {
        setError(`${file.name} is not an image file.`);
        return false;
      }
      
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError(`${file.name} is too large. Maximum size is 5MB.`);
        return false;
      }
      
      return true;
    });
    
    // Check maximum number of images (5 total including existing)
    const totalImages = existingImages.length + imageFiles.length + validFiles.length;
    if (totalImages > 5) {
      setError('Maximum 5 images allowed.');
      return;
    }
    
    // Add new files
    setImageFiles(prev => [...prev, ...validFiles]);
    
    // Create and set previews
    const newPreviews = validFiles.map(file => URL.createObjectURL(file));
    setImagePreviews(prev => [...prev, ...newPreviews]);
    
    // Show success message
    if (validFiles.length > 0) {
      setSuccess(`${validFiles.length} image${validFiles.length > 1 ? 's' : ''} added. Your changes will be saved when you submit the form.`);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    }
    
    // Clear error if successful
    setError(null);
  };

  // Remove a pending image
  const handleRemoveImage = (index) => {
    // Release the object URL to avoid memory leaks
    URL.revokeObjectURL(imagePreviews[index]);
    
    // Remove the file and preview
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
    
    // Show feedback message
    setSuccess("Image removed. Changes will be saved when you submit the form.");
    
    // Clear success message after 3 seconds
    setTimeout(() => {
      setSuccess(null);
    }, 3000);
  };

  // Mark an existing image for deletion
  const handleRemoveExistingImage = (index) => {
    const imageToDelete = existingImages[index];
    setImagesToDelete(prev => [...prev, imageToDelete]);
    setExistingImages(prev => prev.filter((_, i) => i !== index));
    
    // Show feedback message
    setSuccess("Image marked for removal. Changes will be saved when you submit the form.");
    
    // Clear success message after 3 seconds
    setTimeout(() => {
      setSuccess(null);
    }, 3000);
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    
    // Validate required fields
    const requiredFields = ['name', 'description', 'category', 'condition', 'current_price'];
    const missingFields = requiredFields.filter(field => !formData[field]);
    
    if (missingFields.length > 0) {
      setError(`Please fill out all required fields: ${missingFields.join(', ')}`);
      setLoading(false);
      return;
    }
    
    try {
      // Prepare the tool data with parsed numeric values
      const toolData = {
        ...formData,
        current_price: parseFloat(formData.current_price),
        original_price: formData.original_price ? parseFloat(formData.original_price) : null,
        
        // Handle shipping data
        shipping: formData.shipping.useDefault ? { useDefault: true } : {
          useDefault: false,
          methods: formData.shipping.methods,
          price: parseFloat(formData.shipping.price) || 0,
          offersFreeShipping: formData.shipping.offersFreeShipping,
          freeShippingThreshold: parseFloat(formData.shipping.freeShippingThreshold) || 0,
          offerLocalPickup: formData.shipping.offerLocalPickup
        },
        
        // Handle returns data
        returns: formData.returns.useDefault ? { useDefault: true } : {
          useDefault: false,
          acceptsReturns: formData.returns.acceptsReturns,
          returnPeriod: parseInt(formData.returns.returnPeriod) || 14,
          conditions: formData.returns.conditions
        }
      };
      
      let toolId;
      
      // Create or update the tool
      if (isEditMode) {
        await updateTool(id, toolData);
        toolId = id;
        
        // Delete marked images
        for (const image of imagesToDelete) {
          await deleteToolImage(toolId, image.path);
        }
      } else {
        // Create new tool
        const newTool = await createTool(toolData, user.uid);
        toolId = newTool.id;
      }
      
      // Upload new images
      for (const file of imageFiles) {
        await uploadToolImage(file, toolId);
      }
      
      // Success!
      setSuccess('Tool listing saved successfully!');
      
      // Redirect after a short delay
      setTimeout(() => {
        navigate(`/tools/${toolId}`);
      }, 1500);
    } catch (err) {
      setError('Failed to save listing. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !imageFiles.length) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <div className="text-center">
          <div className="text-2xl font-bold mb-2">Loading...</div>
          <div className="text-gray-500">Please wait while we load your data.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      {!hideTitle && (
        <h1 className="text-2xl font-bold mb-6">
          {isEditMode ? 'Edit Tool Listing' : 'Create New Tool Listing'}
        </h1>
      )}
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {success && (
        <div className="fixed top-4 right-4 z-50 bg-green-50 border border-green-100 text-green-700 px-4 py-3 rounded-md shadow-lg max-w-md animate-fade-in-out flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span>{success}</span>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Basic Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Tool Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Tool Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="e.g., Milwaukee M18 Drill"
              />
            </div>
            
            {/* Category */}
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                Category *
              </label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white"
                style={{ 
                  height: '42px', 
                  appearance: 'none',
                  backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23666666%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")',
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 0.7rem top 50%',
                  backgroundSize: '0.65rem auto',
                  paddingRight: '2rem'
                }}
              >
                <option value="">Select a category</option>
                {toolCategories.map(category => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Condition */}
            <div>
              <label htmlFor="condition" className="block text-sm font-medium text-gray-700 mb-1">
                Condition *
              </label>
              <select
                id="condition"
                name="condition"
                value={formData.condition}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white"
                style={{ 
                  height: '42px', 
                  appearance: 'none',
                  backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23666666%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")',
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 0.7rem top 50%',
                  backgroundSize: '0.65rem auto',
                  paddingRight: '2rem'
                }}
              >
                <option value="">Select condition</option>
                {toolConditions.map(condition => (
                  <option key={condition} value={condition}>
                    {condition}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Brand */}
            <div>
              <label htmlFor="brand" className="block text-sm font-medium text-gray-700 mb-1">
                Brand
              </label>
              <input
                type="text"
                id="brand"
                name="brand"
                value={formData.brand}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="e.g., Milwaukee, DeWalt, Makita"
              />
            </div>
            
            {/* Model */}
            <div>
              <label htmlFor="model" className="block text-sm font-medium text-gray-700 mb-1">
                Model
              </label>
              <input
                type="text"
                id="model"
                name="model"
                value={formData.model}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="e.g., M18 FUEL"
              />
            </div>
            
            {/* Location */}
            <div>
              <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
                Location
              </label>
              <input
                type="text"
                id="location"
                name="location"
                value={formData.location}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="e.g., San Francisco, CA"
              />
            </div>
          </div>
          
          {/* Description */}
          <div className="mt-4">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description *
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              placeholder="Provide details about your tool..."
            />
          </div>
        </div>
        
        {/* Pricing */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Pricing</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Current Price */}
            <div>
              <label htmlFor="current_price" className="block text-sm font-medium text-gray-700 mb-1">
                Price *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500">$</span>
                </div>
                <input
                  type="number"
                  id="current_price"
                  name="current_price"
                  value={formData.current_price}
                  onChange={handleChange}
                  min="0"
                  step="1"
                  className="w-full border border-gray-300 rounded-md pl-7 pr-3 py-2"
                  placeholder="0"
                />
              </div>
            </div>
            
            {/* Original Price */}
            <div>
              <label htmlFor="original_price" className="block text-sm font-medium text-gray-700 mb-1">
                Original Price (if discounted)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500">$</span>
                </div>
                <input
                  type="number"
                  id="original_price"
                  name="original_price"
                  value={formData.original_price}
                  onChange={handleChange}
                  min="0"
                  step="1"
                  className="w-full border border-gray-300 rounded-md pl-7 pr-3 py-2"
                  placeholder="0"
                />
              </div>
            </div>
          </div>
        </div>
        
        {/* Additional Details */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Additional Details</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Age */}
            <div>
              <label htmlFor="age" className="block text-sm font-medium text-gray-700 mb-1">
                Age
              </label>
              <input
                type="text"
                id="age"
                name="age"
                value={formData.age}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="e.g., 2 years"
              />
            </div>
            
            {/* Material */}
            <div>
              <label htmlFor="material" className="block text-sm font-medium text-gray-700 mb-1">
                Material
              </label>
              <input
                type="text"
                id="material"
                name="material"
                value={formData.material}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="e.g., Metal, Plastic"
              />
            </div>
            
            {/* Dimensions */}
            <div>
              <label htmlFor="dimensions" className="block text-sm font-medium text-gray-700 mb-1">
                Dimensions
              </label>
              <input
                type="text"
                id="dimensions"
                name="dimensions"
                value={formData.dimensions}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="e.g., 10 x 5 x 3 inches"
              />
            </div>
          </div>
        </div>
        
        {/* Shipping Options */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Shipping Options</h2>
          
          <div className="mb-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="useDefaultShipping"
                checked={formData.shipping.useDefault}
                onChange={() => handleUseDefaultToggle('shipping')}
                className="h-4 w-4 text-green-700 focus:ring-green-700 border-gray-300 rounded"
              />
              <label htmlFor="useDefaultShipping" className="ml-2 block text-sm text-gray-700">
                Use my default shipping settings
              </label>
            </div>
            <p className="text-xs text-gray-500 mt-1 ml-6">
              You can configure your default shipping settings in Seller Dashboard &gt; Settings &gt; Shipping & Pickup
            </p>
          </div>
          
          {!formData.shipping.useDefault && (
            <div className="mt-4 space-y-4 border-t border-gray-200 pt-4">
              <div>
                <h3 className="text-lg font-medium mb-3">Shipping Methods</h3>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <input
                      id="method-standard"
                      type="checkbox"
                      className="h-4 w-4 text-green-700 focus:ring-green-700 border-gray-300 rounded"
                      checked={formData.shipping.methods.includes('standard')}
                      onChange={() => handleShippingMethodChange('standard')}
                    />
                    <label htmlFor="method-standard" className="ml-2 block text-sm">
                      <span className="font-medium text-gray-700">Standard Shipping</span>
                      <p className="text-xs text-gray-500">Regular delivery (3-5 business days)</p>
                    </label>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      id="method-express"
                      type="checkbox"
                      className="h-4 w-4 text-green-700 focus:ring-green-700 border-gray-300 rounded"
                      checked={formData.shipping.methods.includes('express')}
                      onChange={() => handleShippingMethodChange('express')}
                    />
                    <label htmlFor="method-express" className="ml-2 block text-sm">
                      <span className="font-medium text-gray-700">Express Shipping</span>
                      <p className="text-xs text-gray-500">Faster delivery (1-2 business days)</p>
                    </label>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      id="method-economy"
                      type="checkbox"
                      className="h-4 w-4 text-green-700 focus:ring-green-700 border-gray-300 rounded"
                      checked={formData.shipping.methods.includes('economy')}
                      onChange={() => handleShippingMethodChange('economy')}
                    />
                    <label htmlFor="method-economy" className="ml-2 block text-sm">
                      <span className="font-medium text-gray-700">Economy Shipping</span>
                      <p className="text-xs text-gray-500">Budget-friendly (5-7 business days)</p>
                    </label>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      id="method-freight"
                      type="checkbox"
                      className="h-4 w-4 text-green-700 focus:ring-green-700 border-gray-300 rounded"
                      checked={formData.shipping.methods.includes('freight')}
                      onChange={() => handleShippingMethodChange('freight')}
                    />
                    <label htmlFor="method-freight" className="ml-2 block text-sm">
                      <span className="font-medium text-gray-700">Freight</span>
                      <p className="text-xs text-gray-500">For large equipment</p>
                    </label>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label 
                    htmlFor="shippingPrice" 
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Shipping Price ($)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500">$</span>
                    </div>
                    <input
                      type="number"
                      id="shippingPrice"
                      min="0"
                      step="0.01"
                      value={formData.shipping.price}
                      onChange={(e) => handleNestedChange('shipping', 'price', e.target.value)}
                      className="w-full border border-gray-300 rounded-md pl-7 pr-3 py-2"
                      placeholder="15.00"
                    />
                  </div>
                </div>
                
                <div>
                  <div className="flex items-center h-10">
                    <input
                      id="offerLocalPickup"
                      type="checkbox"
                      className="h-4 w-4 text-green-700 focus:ring-green-700 border-gray-300 rounded"
                      checked={formData.shipping.offerLocalPickup}
                      onChange={() => handleNestedChange('shipping', 'offerLocalPickup', !formData.shipping.offerLocalPickup)}
                    />
                    <label htmlFor="offerLocalPickup" className="ml-2 block text-sm font-medium text-gray-700">
                      Offer Local Pickup
                    </label>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 space-y-3">
                <div className="flex items-center">
                  <input
                    id="offersFreeShipping"
                    type="checkbox"
                    className="h-4 w-4 text-green-700 focus:ring-green-700 border-gray-300 rounded"
                    checked={formData.shipping.offersFreeShipping}
                    onChange={() => handleNestedChange('shipping', 'offersFreeShipping', !formData.shipping.offersFreeShipping)}
                  />
                  <label htmlFor="offersFreeShipping" className="ml-2 block text-sm font-medium text-gray-700">
                    Offer Free Shipping
                  </label>
                </div>
                
                {formData.shipping.offersFreeShipping && (
                  <div className="ml-6 mt-2">
                    <label 
                      htmlFor="freeShippingThreshold" 
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Free Shipping Threshold ($)
                    </label>
                    <div className="relative max-w-xs">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-500">$</span>
                      </div>
                      <input
                        type="number"
                        id="freeShippingThreshold"
                        min="0"
                        step="1"
                        value={formData.shipping.freeShippingThreshold}
                        onChange={(e) => handleNestedChange('shipping', 'freeShippingThreshold', e.target.value)}
                        className="w-full border border-gray-300 rounded-md pl-7 pr-3 py-2"
                        placeholder="100"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Orders above this amount qualify for free shipping
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        
        {/* Return Policy */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Return Policy</h2>
          
          <div className="mb-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="useDefaultReturns"
                checked={formData.returns.useDefault}
                onChange={() => handleUseDefaultToggle('returns')}
                className="h-4 w-4 text-green-700 focus:ring-green-700 border-gray-300 rounded"
              />
              <label htmlFor="useDefaultReturns" className="ml-2 block text-sm text-gray-700">
                Use my default return policy
              </label>
            </div>
            <p className="text-xs text-gray-500 mt-1 ml-6">
              You can configure your default return policy in Seller Dashboard &gt; Settings &gt; Store Policies
            </p>
          </div>
          
          {!formData.returns.useDefault && (
            <div className="mt-4 space-y-4 border-t border-gray-200 pt-4">
              <div className="flex items-center">
                <input
                  id="acceptsReturns"
                  type="checkbox"
                  className="h-4 w-4 text-green-700 focus:ring-green-700 border-gray-300 rounded"
                  checked={formData.returns.acceptsReturns}
                  onChange={() => handleNestedChange('returns', 'acceptsReturns', !formData.returns.acceptsReturns)}
                />
                <label htmlFor="acceptsReturns" className="ml-2 block text-sm font-medium text-gray-700">
                  Accept Returns
                </label>
              </div>
              
              {formData.returns.acceptsReturns && (
                <div className="ml-6 space-y-4">
                  <div>
                    <label 
                      htmlFor="returnPeriod" 
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Return Period (days)
                    </label>
                    <input
                      type="number"
                      id="returnPeriod"
                      min="1"
                      max="90"
                      value={formData.returns.returnPeriod}
                      onChange={(e) => handleNestedChange('returns', 'returnPeriod', e.target.value)}
                      className="w-32 border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                  
                  <div>
                    <label 
                      htmlFor="returnConditions" 
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Return Conditions
                    </label>
                    <textarea
                      id="returnConditions"
                      value={formData.returns.conditions}
                      onChange={(e) => handleNestedChange('returns', 'conditions', e.target.value)}
                      rows="3"
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                      placeholder="Describe any conditions for accepting returns (e.g., item must be unused, original packaging required)"
                    ></textarea>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Images */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Images</h2>
          <p className="text-sm text-gray-500 mb-4">
            Upload up to 5 high-quality images of your tool. First image will be the main image.
          </p>
          
          {/* Existing Images */}
          {existingImages.length > 0 && (
            <div className="mb-4">
              <h3 className="text-lg font-medium mb-2">Current Images</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                {existingImages.map((image, index) => (
                  <div key={index} className="relative">
                    <img
                      src={image.url}
                      alt={`Tool image ${index + 1}`}
                      className="w-full h-32 object-cover rounded-md"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveExistingImage(index)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"
                      title="Remove image"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* New Image Previews */}
          {imagePreviews.length > 0 && (
            <div className="mb-4">
              <h3 className="text-lg font-medium mb-2">New Images</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                {imagePreviews.map((preview, index) => (
                  <div key={index} className="relative">
                    <img
                      src={preview}
                      alt={`New tool image ${index + 1}`}
                      className="w-full h-32 object-cover rounded-md"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(index)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"
                      title="Remove image"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Image Upload */}
          {(existingImages.length + imagePreviews.length) < 5 && (
            <div className="mt-4">
              <label htmlFor="images" className="block text-sm font-medium text-gray-700 mb-2">
                Upload Images
              </label>
              <input
                type="file"
                id="images"
                name="images"
                accept="image/*"
                multiple
                onChange={handleImageSelect}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
              <p className="text-xs text-gray-500 mt-1">
                Maximum 5 images, 5MB each. Accepted formats: JPG, PNG, GIF.
              </p>
            </div>
          )}
        </div>
        
        {/* Submit Buttons */}
        <div className="flex flex-wrap gap-4 justify-end">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-6 py-2 bg-gray-200 text-gray-800 rounded-md font-medium"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-green-700 text-white rounded-md font-medium hover:bg-green-800 disabled:opacity-50"
          >
            {loading ? (
              <span>Saving...</span>
            ) : (
              <span>{isEditMode ? 'Update Listing' : 'Create Listing'}</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ToolListingForm;