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
  });

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [existingImages, setExistingImages] = useState([]);
  const [imagesToDelete, setImagesToDelete] = useState([]);

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