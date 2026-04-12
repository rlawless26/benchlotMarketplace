import React, { useState, useEffect } from 'react';
import {
  ArrowRight,
  CheckCircle,
  ChevronRight,
  ChevronDown,
  AlertTriangle,
  Camera,
  X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../firebase/hooks/useAuth';
import { useSeller } from '../firebase/hooks/useSeller';
import { toolCategories, toolConditions, createTool, uploadToolImage } from '../firebase/models/toolModel';
import { openAuthModal } from '../utils/featureFlags';
import StripeStatusBanner from './StripeStatusBanner';

// US state options for dropdown
const stateOptions = [
  { value: "AL", label: "Alabama" },
  { value: "AK", label: "Alaska" },
  { value: "AZ", label: "Arizona" },
  { value: "AR", label: "Arkansas" },
  { value: "CA", label: "California" },
  { value: "CO", label: "Colorado" },
  { value: "CT", label: "Connecticut" },
  { value: "DE", label: "Delaware" },
  { value: "FL", label: "Florida" },
  { value: "GA", label: "Georgia" },
  { value: "HI", label: "Hawaii" },
  { value: "ID", label: "Idaho" },
  { value: "IL", label: "Illinois" },
  { value: "IN", label: "Indiana" },
  { value: "IA", label: "Iowa" },
  { value: "KS", label: "Kansas" },
  { value: "KY", label: "Kentucky" },
  { value: "LA", label: "Louisiana" },
  { value: "ME", label: "Maine" },
  { value: "MD", label: "Maryland" },
  { value: "MA", label: "Massachusetts" },
  { value: "MI", label: "Michigan" },
  { value: "MN", label: "Minnesota" },
  { value: "MS", label: "Mississippi" },
  { value: "MO", label: "Missouri" },
  { value: "MT", label: "Montana" },
  { value: "NE", label: "Nebraska" },
  { value: "NV", label: "Nevada" },
  { value: "NH", label: "New Hampshire" },
  { value: "NJ", label: "New Jersey" },
  { value: "NM", label: "New Mexico" },
  { value: "NY", label: "New York" },
  { value: "NC", label: "North Carolina" },
  { value: "ND", label: "North Dakota" },
  { value: "OH", label: "Ohio" },
  { value: "OK", label: "Oklahoma" },
  { value: "OR", label: "Oregon" },
  { value: "PA", label: "Pennsylvania" },
  { value: "RI", label: "Rhode Island" },
  { value: "SC", label: "South Carolina" },
  { value: "SD", label: "South Dakota" },
  { value: "TN", label: "Tennessee" },
  { value: "TX", label: "Texas" },
  { value: "UT", label: "Utah" },
  { value: "VT", label: "Vermont" },
  { value: "VA", label: "Virginia" },
  { value: "WA", label: "Washington" },
  { value: "WV", label: "West Virginia" },
  { value: "WI", label: "Wisconsin" },
  { value: "WY", label: "Wyoming" },
  { value: "DC", label: "District of Columbia" },
  { value: "PR", label: "Puerto Rico" },
];

/**
 * SellerOnboardAndListPage Component
 *
 * Combined form for seller signup and listing creation.
 * 3-step flow: Seller Profile → Tool Details → Photos & Publish
 * Payout details are deferred until the tool sells.
 */
const SellerOnboardAndListPage = () => {
  const { user } = useAuth();
  const { createSellerAccount } = useSeller();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [formStep, setFormStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Photo state
  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);

  // Post-publish state (for step 4 success screen — see Fix 6)
  const [publishedTool, setPublishedTool] = useState(null);
  const [stripeFailed, setStripeFailed] = useState(false);

  // Combined form data
  const [formData, setFormData] = useState({
    // Seller profile
    sellerName: '',
    sellerType: 'individual',
    city: '',
    state: '',
    contactEmail: '',
    contactPhone: '',

    // Tool details
    toolName: '',
    description: '',
    category: '',
    condition: '',
    brand: '',
    model: '',
    current_price: '',
    material: '',
    dimensions: '',
    age: '',
    shipping_price: '',
    free_shipping: false,
  });

  // Scroll to top when step changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [formStep]);

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        sellerName: user.displayName || '',
        contactEmail: user.email || '',
        toolName: localStorage.getItem('draftToolName') || '',
      }));
      setLoading(false);
    } else {
      if (!loading) {
        openAuthModal('signup', '/seller/onboard-and-list');
      }
    }
  }, [user, loading]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Handle seller profile form submission (step 1 → step 2)
  const handleSellerProfileSubmit = (e) => {
    e.preventDefault();
    if (!formData.sellerName || !formData.contactEmail) {
      setError('Please fill out all required fields');
      return;
    }
    setError(null);
    setFormStep(2);
  };

  // Handle tool listing validation (step 2 → step 3)
  const handleToolDetailsSubmit = () => {
    const requiredFields = ['toolName', 'description', 'category', 'condition', 'current_price'];
    const missingFields = requiredFields.filter(field => !formData[field]);

    if (missingFields.length > 0) {
      setError(`Please fill out all required fields: ${missingFields.join(', ')}`);
      return;
    }

    setError(null);
    setFormStep(3);
  };

  // Handle image selection
  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files);
    const totalImages = imageFiles.length + files.length;

    if (totalImages > 5) {
      setError('Maximum 5 images allowed');
      return;
    }

    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) {
        setError(`${file.name} exceeds 5MB limit`);
        return;
      }
    }

    setError(null);
    const newPreviews = files.map(file => URL.createObjectURL(file));
    setImageFiles(prev => [...prev, ...files]);
    setImagePreviews(prev => [...prev, ...newPreviews]);
  };

  // Remove an image
  const handleRemoveImage = (index) => {
    URL.revokeObjectURL(imagePreviews[index]);
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  // Handle final publish
  const handlePublish = async () => {
    // Defensive guard: UI prevents this, but bail loudly if anything bypasses it.
    if (imageFiles.length === 0) {
      setError('At least one photo is required to publish your listing.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setStripeFailed(false);

    try {
      // Step 1: Create seller account.
      // useSeller.createSellerAccount sets isSeller=true on the user doc BEFORE
      // calling Stripe, so even if the Stripe API call fails, the user is marked
      // as a seller and can publish + retry payouts later. We treat Stripe failures
      // as non-blocking and surface them via the post-publish step 4 screen.
      const sellerAccountResult = await createSellerAccount({
        sellerName: formData.sellerName,
        sellerType: formData.sellerType,
        location: `${formData.city}, ${formData.state}`,
        businessCity: formData.city,
        businessState: formData.state,
        contactEmail: formData.contactEmail,
        contactPhone: formData.contactPhone,
        isSeller: true,
        'profile.isSeller': true
      });

      if (!sellerAccountResult.success) {
        console.error('[publish] Stripe account setup failed (non-blocking):', {
          userId: user.uid,
          error: sellerAccountResult.error,
        });
        setStripeFailed(true);
      }

      // Step 2: Create the tool listing
      const toolData = {
        name: formData.toolName,
        description: formData.description,
        category: formData.category,
        condition: formData.condition,
        brand: formData.brand,
        model: formData.model,
        current_price: parseFloat(formData.current_price) || 0,
        material: formData.material,
        dimensions: formData.dimensions,
        age: formData.age,
        shipping_price: parseFloat(formData.shipping_price) || 0,
        free_shipping: formData.free_shipping || false,
        shipping_location: formData.city && formData.state ? `${formData.city}, ${formData.state}` : ''
      };

      const newTool = await createTool(toolData, user.uid);

      // Step 3: Upload photos
      for (const file of imageFiles) {
        await uploadToolImage(file, newTool.id);
      }

      // Clean up
      localStorage.removeItem('draftToolName');
      localStorage.removeItem('pendingToolListing');
      imagePreviews.forEach(url => URL.revokeObjectURL(url));

      // Render the step 4 success screen instead of redirecting
      setPublishedTool(newTool);
      setFormStep(4);
      setIsSubmitting(false);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
      setIsSubmitting(false);
      console.error('Error publishing listing:', err);
    }
  };

  // Reset the form to publish another tool — keeps seller profile intact.
  const handleListAnother = () => {
    setFormData(prev => ({
      ...prev,
      toolName: '',
      description: '',
      category: '',
      condition: '',
      brand: '',
      model: '',
      current_price: '',
      original_price: '',
      material: '',
      dimensions: '',
      age: '',
      shipping_price: '',
      free_shipping: false,
    }));
    setImageFiles([]);
    setImagePreviews([]);
    setPublishedTool(null);
    setStripeFailed(false);
    setError(null);
    setFormStep(2);
  };

  if (loading) {
    return (
      <div className="bg-bone min-h-screen">
        <main className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-spruce"></div>
            <span className="ml-2 text-gray-600">Loading...</span>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="bg-bone min-h-screen">
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-bone-light rounded-lg shadow-md border border-default p-6 md:p-8">
          {/* Header — hidden on step 4 since the green success card provides the heading */}
          {formStep <= 3 && (
            <>
              <h1 className="text-2xl md:text-3xl font-medium text-gray-800 mb-2">
                {formStep === 1 ? 'Start Selling on Benchlot' :
                 formStep === 2 ? 'Tell us about your tool' :
                 'Add photos & publish'}
              </h1>
              <p className="text-gray-600 mb-6">
                {formStep === 1 ? 'Complete your seller profile to begin listing tools.' :
                 formStep === 2 ? 'Provide details about the tool you want to sell.' :
                 'Add photos to help your tool sell faster, then publish your listing.'}
              </p>
            </>
          )}

          {/* Progress Steps — 3 steps (hidden after publish) */}
          {formStep <= 3 && (
          <div className="mb-8">
            <div className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                formStep >= 1 ? 'bg-honey text-dark-teal' : 'bg-gray-200'
              }`}>
                1
              </div>
              <div className={`flex-1 h-1 mx-2 ${
                formStep >= 2 ? 'bg-spruce' : 'bg-gray-200'
              }`}></div>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                formStep >= 2 ? 'bg-honey text-dark-teal' : 'bg-gray-200'
              }`}>
                2
              </div>
              <div className={`flex-1 h-1 mx-2 ${
                formStep >= 3 ? 'bg-spruce' : 'bg-gray-200'
              }`}></div>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                formStep >= 3 ? 'bg-honey text-dark-teal' : 'bg-gray-200'
              }`}>
                3
              </div>
            </div>
            <div className="flex justify-between mt-2 text-sm text-gray-600">
              <span>Seller Profile</span>
              <span>Tool Details</span>
              <span>Photos & Publish</span>
            </div>
          </div>
          )}

          {/* Step 1: Seller Profile Form */}
          {formStep === 1 && (
            <form onSubmit={handleSellerProfileSubmit} className="space-y-6">
              <div>
                <label className="block text-gray-700 font-medium mb-1" htmlFor="sellerName">
                  Seller Name*
                </label>
                <input
                  type="text"
                  id="sellerName"
                  name="sellerName"
                  value={formData.sellerName}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-spruce"
                  required
                />
                <p className="text-sm text-gray-500 mt-1">This is how you'll appear to buyers</p>
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-1">
                  I'm selling as:
                </label>
                <div className="flex space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="sellerType"
                      value="individual"
                      checked={formData.sellerType === 'individual'}
                      onChange={handleChange}
                      className="mr-2"
                    />
                    <span>Individual</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="sellerType"
                      value="business"
                      checked={formData.sellerType === 'business'}
                      onChange={handleChange}
                      className="mr-2"
                    />
                    <span>Business</span>
                  </label>
                </div>
                {formData.sellerType === 'individual' && (
                  <p className="text-sm text-spruce mt-1">
                    Recommended: Faster verification for individuals
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 font-medium mb-1" htmlFor="city">
                    City*
                  </label>
                  <input
                    type="text"
                    id="city"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-spruce"
                    required
                    placeholder="Enter your city"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-1" htmlFor="state">
                    State*
                  </label>
                  <div className="relative">
                    <select
                      id="state"
                      name="state"
                      value={formData.state}
                      onChange={handleChange}
                      className="w-full appearance-none px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:border-spruce bg-white"
                      required
                    >
                      <option value="">Select a state</option>
                      {stateOptions.map(state => (
                        <option key={state.value} value={state.value}>{state.label}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-1" htmlFor="contactEmail">
                  Contact Email*
                </label>
                <input
                  type="email"
                  id="contactEmail"
                  name="contactEmail"
                  value={formData.contactEmail}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-spruce"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-1" htmlFor="contactPhone">
                  Contact Phone
                </label>
                <input
                  type="tel"
                  id="contactPhone"
                  name="contactPhone"
                  value={formData.contactPhone}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-spruce"
                />
                <p className="text-sm text-gray-500 mt-1">Optional, but helps with local pickup</p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mt-6 flex items-start">
                  <AlertTriangle className="h-5 w-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div className="pt-4">
                <button
                  type="submit"
                  className="w-full py-3 bg-honey text-dark-teal rounded-md hover:bg-honey-light font-medium flex items-center justify-center cursor-pointer"
                >
                  <span>Continue to Tool Details</span>
                  <ChevronRight className="ml-2 h-4 w-4" />
                </button>
              </div>
            </form>
          )}

          {/* Step 2: Tool Details */}
          {formStep === 2 && (
            <div className="space-y-6">
              {/* Tool Information */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="text-lg font-medium text-gray-800 mb-4">Tool Information</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="toolName" className="block text-sm font-medium text-gray-700 mb-1">
                      Tool Name*
                    </label>
                    <input
                      type="text"
                      id="toolName"
                      name="toolName"
                      value={formData.toolName}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-spruce"
                      placeholder="e.g., Lie-Nielsen No. 4 Smoothing Plane"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                      Category*
                    </label>
                    <div className="relative">
                      <select
                        id="category"
                        name="category"
                        value={formData.category}
                        onChange={handleChange}
                        className="w-full appearance-none px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:border-spruce bg-white"
                        required
                      >
                        <option value="">Select a category</option>
                        {toolCategories.map(category => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="condition" className="block text-sm font-medium text-gray-700 mb-1">
                      Condition*
                    </label>
                    <div className="relative">
                      <select
                        id="condition"
                        name="condition"
                        value={formData.condition}
                        onChange={handleChange}
                        className="w-full appearance-none px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:border-spruce bg-white"
                        required
                      >
                        <option value="">Select condition</option>
                        {toolConditions.map(condition => (
                          <option key={condition} value={condition}>
                            {condition}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
                    </div>
                  </div>

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
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-spruce"
                      placeholder="e.g., Lie-Nielsen, Stanley, Veritas"
                    />
                  </div>

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
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-spruce"
                      placeholder="e.g., No. 4, No. 62"
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                    Description*
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-spruce"
                    placeholder="Describe your tool's condition, history, and any included accessories..."
                    required
                  />
                </div>
              </div>

              {/* Pricing */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="text-lg font-medium text-gray-800 mb-4">Pricing</h3>

                <div>
                  <label htmlFor="current_price" className="block text-sm font-medium text-gray-700 mb-1">
                    Price*
                  </label>
                  <div className="relative w-full md:w-1/2">
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-md pl-7 focus:outline-none focus:border-spruce"
                      placeholder="0"
                      required
                    />
                  </div>
                </div>

                <h4 className="text-sm font-medium text-gray-700 mt-4 mb-2">Shipping</h4>
                <div className="flex items-center mb-3">
                  <input
                    type="checkbox"
                    id="free_shipping"
                    name="free_shipping"
                    checked={formData.free_shipping}
                    onChange={(e) => {
                      setFormData({
                        ...formData,
                        free_shipping: e.target.checked,
                        shipping_price: e.target.checked ? '0' : formData.shipping_price
                      });
                    }}
                    className="h-4 w-4 text-spruce focus:ring-spruce border-gray-300 rounded"
                  />
                  <label htmlFor="free_shipping" className="ml-2 block text-sm text-gray-700">
                    Offer free shipping
                  </label>
                </div>

                {!formData.free_shipping && (
                  <div>
                    <label htmlFor="shipping_price" className="block text-sm font-medium text-gray-700 mb-1">
                      Shipping Price
                    </label>
                    <div className="relative w-1/2">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-500">$</span>
                      </div>
                      <input
                        type="number"
                        id="shipping_price"
                        name="shipping_price"
                        value={formData.shipping_price}
                        onChange={handleChange}
                        min="0"
                        step="1"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md pl-7 focus:outline-none focus:border-spruce"
                        placeholder="0"
                      />
                    </div>
                  </div>
                )}
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mt-6 flex items-start">
                  <AlertTriangle className="h-5 w-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Navigation */}
              <div className="flex justify-between pt-4">
                <button
                  type="button"
                  onClick={() => setFormStep(1)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleToolDetailsSubmit}
                  className="px-6 py-3 bg-honey text-dark-teal rounded-md hover:bg-honey-light font-medium flex items-center cursor-pointer"
                >
                  <span>Add Photos & Publish</span>
                  <ArrowRight className="ml-2 h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Photos & Publish */}
          {formStep === 3 && (
            <div className="space-y-6">
              {/* Photo Upload */}
              <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                <div className="flex items-center mb-4">
                  <Camera className="h-5 w-5 text-gray-600 mr-2" />
                  <h3 className="text-lg font-medium text-gray-800">Photos</h3>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  Add up to 5 photos of your tool. At least one photo is required to publish.
                </p>

                {/* Image Previews */}
                {imagePreviews.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-4">
                    {imagePreviews.map((preview, index) => (
                      <div key={index} className="relative">
                        <img
                          src={preview}
                          alt={`Upload ${index + 1}`}
                          className="w-full h-32 object-cover rounded-md"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(index)}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 cursor-pointer"
                          title="Remove image"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {imagePreviews.length < 5 && (
                  <div>
                    <label
                      htmlFor="photos"
                      className="inline-flex items-center px-4 py-2 border-2 border-dashed border-gray-300 rounded-md text-sm text-gray-600 hover:border-spruce hover:text-spruce cursor-pointer transition-colors"
                    >
                      <Camera className="h-4 w-4 mr-2" />
                      {imagePreviews.length === 0 ? 'Choose Photos' : 'Add More Photos'}
                    </label>
                    <input
                      type="file"
                      id="photos"
                      accept="image/*"
                      multiple
                      onChange={handleImageSelect}
                      className="hidden"
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      Maximum 5 images, 5MB each. JPG, PNG, or GIF.
                    </p>
                  </div>
                )}
              </div>

              {/* Listing Summary */}
              <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                <h3 className="text-lg font-medium text-gray-800 mb-4">Listing Summary</h3>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                  <div className="text-gray-500">Tool</div>
                  <div className="text-gray-800 font-medium">{formData.toolName}</div>
                  <div className="text-gray-500">Category</div>
                  <div className="text-gray-800">{formData.category}</div>
                  <div className="text-gray-500">Condition</div>
                  <div className="text-gray-800">{formData.condition}</div>
                  <div className="text-gray-500">Price</div>
                  <div className="text-honey font-medium">${parseFloat(formData.current_price).toFixed(2)}</div>
                  {formData.brand && (
                    <>
                      <div className="text-gray-500">Brand</div>
                      <div className="text-gray-800">{formData.brand}</div>
                    </>
                  )}
                  <div className="text-gray-500">Shipping</div>
                  <div className="text-gray-800">
                    {formData.free_shipping ? 'Free shipping' : `$${parseFloat(formData.shipping_price || 0).toFixed(2)}`}
                  </div>
                  <div className="text-gray-500">Photos</div>
                  <div className={imageFiles.length > 0 ? 'text-gray-800' : 'text-red-700'}>
                    {imageFiles.length > 0 ? `${imageFiles.length} photo${imageFiles.length > 1 ? 's' : ''}` : 'Required — add at least one photo above'}
                  </div>
                </div>
              </div>

              {/* Payout info note */}
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg text-sm text-blue-700">
                <strong>When do I get paid?</strong> You'll be prompted to set up your payout details when your tool sells.
                You can also add them anytime from your Seller Dashboard.
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md flex items-start">
                  <AlertTriangle className="h-5 w-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Navigation */}
              <div className="pt-4">
                {imageFiles.length === 0 && (
                  <p className="text-sm text-gray-600 mb-3 text-right">
                    Add at least one photo to publish your listing.
                  </p>
                )}
                <div className="flex justify-between">
                  <button
                    type="button"
                    onClick={() => setFormStep(2)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handlePublish}
                    disabled={isSubmitting || imageFiles.length === 0}
                    className="px-8 py-3 bg-honey text-dark-teal rounded-md hover:bg-honey-light font-medium flex items-center cursor-pointer disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed disabled:hover:bg-gray-200"
                  >
                    {isSubmitting ? (
                      <>
                        <span className="h-4 w-4 border-2 border-dark-teal border-t-transparent rounded-full animate-spin mr-2"></span>
                        Publishing...
                      </>
                    ) : (
                      <>
                        <span>Publish Listing</span>
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Post-publish success */}
          {formStep === 4 && publishedTool && (
            <div className="space-y-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-6 flex items-start">
                <CheckCircle className="h-8 w-8 text-green-600 mr-4 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-medium text-spruce mb-1">
                    {publishedTool.name} is live on Benchlot
                  </h2>
                  <p className="text-gray-700">
                    Your listing is visible to buyers right now.
                  </p>
                </div>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-800 mb-3">What happens next</h3>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start">
                    <span className="text-spruce mr-2">•</span>
                    <span>Buyers can find your listing on the marketplace right now.</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-spruce mr-2">•</span>
                    <span>You'll get an email when someone makes an offer or buys.</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-spruce mr-2">•</span>
                    <span>You can manage this listing anytime from <strong>My Listings</strong>.</span>
                  </li>
                </ul>
              </div>

              {/* Stripe payout warning — shown if either creation failed OR onboarding still incomplete */}
              {stripeFailed ? (
                <div className="bg-red-50 border border-red-200 text-red-800 rounded-md px-5 py-4 flex items-start">
                  <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5 mr-3" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">We couldn't set up your payout account</p>
                    <p className="text-sm text-red-700 mt-1">
                      Your listing is live, but we hit an error setting up Stripe Connect.
                      Set up payouts now so you can get paid when your tool sells.
                    </p>
                    <button
                      type="button"
                      onClick={() => navigate('/seller/onboarding')}
                      className="inline-flex items-center mt-2 text-sm font-medium underline hover:no-underline"
                    >
                      Set Up Payouts →
                    </button>
                  </div>
                </div>
              ) : (
                <StripeStatusBanner />
              )}

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => navigate(`/tools/${publishedTool.id}`)}
                  className="flex-1 px-6 py-3 bg-honey text-dark-teal rounded-md hover:bg-honey-light font-medium flex items-center justify-center cursor-pointer"
                >
                  View Your Listing
                  <ArrowRight className="ml-2 h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={handleListAnother}
                  className="flex-1 px-6 py-3 border border-spruce text-spruce rounded-md hover:bg-spruce hover:text-bone font-medium flex items-center justify-center cursor-pointer transition-colors"
                >
                  List Another Tool
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default SellerOnboardAndListPage;
