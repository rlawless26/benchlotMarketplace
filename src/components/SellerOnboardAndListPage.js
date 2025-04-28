import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  ArrowRight, 
  CheckCircle, 
  Camera,
  ChevronRight,
  Check,
  X,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '../firebase/hooks/useAuth';
import { useSeller } from '../firebase/hooks/useSeller';
import { toolCategories, toolConditions } from '../firebase/models/toolModel';
import { 
  ENABLE_DIRECT_BANK_ACCOUNT, 
  USE_CUSTOM_ACCOUNTS,
  openAuthModal
} from '../utils/featureFlags';

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
 * Combined form for seller signup and listing creation
 * This implements the tool-first flow for seller onboarding
 */
const SellerOnboardAndListPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();
  const { createSellerAccount } = useSeller();
  const [loading, setLoading] = useState(true);
  const [formStep, setFormStep] = useState(1); // 1 = seller info, 2 = tool details, 3 = payout details, 4 = review & publish
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [showEmailVerification, setShowEmailVerification] = useState(false);
  
  // Combined form data
  const [formData, setFormData] = useState({
    // Seller profile
    sellerName: '',
    sellerType: 'individual',
    // Replaced single location with city and state
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
    original_price: '',
    material: '',
    dimensions: '',
    age: '',
    shipping_price: '',
    free_shipping: false,
  });
  
  // Load draft tool name and populate user data
  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (user) {
      // Pre-populate with user data
      setFormData(prev => ({
        ...prev,
        sellerName: user.displayName || '',
        contactEmail: user.email || '',
        toolName: localStorage.getItem('draftToolName') || '',
      }));
      setLoading(false);
    } else {
      // Check if authentication is still in progress
      if (!loading) {
        // If not loading and no user, open auth modal instead of redirecting to login page
        openAuthModal('signup', '/seller/onboard-and-list');
      }
    }
  }, [user, loading]);
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  // Handle seller profile form submission (step 1)
  const handleSellerProfileSubmit = (e) => {
    e.preventDefault();
    
    // Validate seller profile form
    if (!formData.sellerName || !formData.contactEmail) {
      setError('Please fill out all required fields');
      return;
    }
    
    // Proceed to tool listing details
    setError(null);
    setFormStep(2);
  };
  
  // Handle tool listing form validation
  const validateToolListing = () => {
    const requiredFields = ['toolName', 'description', 'category', 'condition', 'current_price'];
    const missingFields = requiredFields.filter(field => !formData[field]);
    
    if (missingFields.length > 0) {
      setError(`Please fill out all required fields: ${missingFields.join(', ')}`);
      return false;
    }
    
    return true;
  };
  
  // Handle final submission (directly from Step 2)
  const handleFinalSubmit = async () => {
    // First validate the tool listing data
    if (!validateToolListing()) {
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      // We don't block progression based on email verification status
      // Users can proceed regardless, but we show them the status in the UI
      
      console.log("Creating seller account with data:", {
        sellerName: formData.sellerName,
        sellerType: formData.sellerType,
        location: formData.location,
        contactEmail: formData.contactEmail,
        contactPhone: formData.contactPhone
      });
      
      // Create Stripe Connect account with seller data
      const sellerAccountResult = await createSellerAccount({
        sellerName: formData.sellerName,
        sellerType: formData.sellerType,
        // Create a formatted location string from city and state
        location: `${formData.city}, ${formData.state}`,
        // Also pass the individual fields
        businessCity: formData.city,
        businessState: formData.state,
        contactEmail: formData.contactEmail,
        contactPhone: formData.contactPhone,
        // Explicitly add seller status flags to ensure they're set correctly
        isSeller: true,
        'profile.isSeller': true
      });
      
      console.log("Seller account creation result:", sellerAccountResult);
      
      // TEMPORARY: Manually override redirect URL if it points to Stripe
      // This lets us test our local BankDetailsPage without deploying to Firebase
      if (sellerAccountResult.success && sellerAccountResult.url) {
        const currentUrl = window.location.origin;
        const accountId = sellerAccountResult.accountId;
        
        // Check if the URL is a Stripe URL
        if (sellerAccountResult.url.includes('stripe.com')) {
          console.log("INTERCEPTED STRIPE REDIRECT! Using local bank details page instead");
          // Override with our local bank details page
          sellerAccountResult.url = `${currentUrl}/seller/bank-details?accountId=${accountId}`;
        }
      }
      
      if (!sellerAccountResult.success) {
        console.error('Seller account creation failed:', sellerAccountResult.error);
        // If the error includes "NOT_FOUND", it's likely a missing document error
        if (sellerAccountResult.error && sellerAccountResult.error.includes("NOT_FOUND")) {
          setError("There was a problem with your account setup. Please try again.");
        } else {
          throw new Error(sellerAccountResult.error || 'Failed to create seller account');
        }
        return; // Exit early to prevent further processing
      }
      
      // Store tool data in localStorage for creation after Stripe onboarding
      const toolData = {
        name: formData.toolName,
        description: formData.description,
        category: formData.category,
        condition: formData.condition,
        brand: formData.brand,
        model: formData.model,
        current_price: parseFloat(formData.current_price) || 0,
        original_price: parseFloat(formData.original_price) || null,
        material: formData.material,
        dimensions: formData.dimensions,
        age: formData.age,
        shipping_price: parseFloat(formData.shipping_price) || 0,
        free_shipping: formData.free_shipping || false,
        shipping_location: `${formData.city}, ${formData.state}`
      };
      
      localStorage.setItem('pendingToolListing', JSON.stringify(toolData));
      
      // Check if we received a URL
      if (!sellerAccountResult.url) {
        throw new Error('No Stripe URL received. Please try again.');
      }
      
      console.log("Redirecting to URL:", sellerAccountResult.url);
      
      // Fix URL for local development - intercept benchlot.com URLs and redirect to localhost
      let redirectUrl = sellerAccountResult.url;
      if (process.env.NODE_ENV === 'development' && redirectUrl.includes('benchlot.com')) {
        // Extract the path and query params
        const urlObj = new URL(redirectUrl);
        const pathWithQuery = urlObj.pathname + urlObj.search;
        // Replace with localhost URL
        redirectUrl = `${window.location.origin}${pathWithQuery}`;
        console.log("Redirecting to local version instead:", redirectUrl);
      }
      
      // Redirect to bank details page
      window.location.href = redirectUrl;
      
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
      setIsSubmitting(false);
      console.error('Error in final submission:', err);
    }
  };
  
  // Handle send verification email
  const handleSendVerificationEmail = async () => {
    try {
      // TODO: Implement email verification sending
      
      setSuccessMessage('Verification email sent. Please check your inbox.');
      
      // In a real implementation, you would call a Firebase function here
      // For now, we'll simulate it with a timeout
      setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
      
    } catch (err) {
      setError('Failed to send verification email. Please try again.');
    }
  };
  
  // Handle checking email verification status
  const handleCheckVerification = () => {
    // Hide email verification overlay and proceed with onboarding
    setShowEmailVerification(false);
    
    // Since we have a placeholder text to verify email,
    // for now we'll just proceed directly to Stripe onboarding
    handleFinalSubmit();
    
    // In a production environment, you would want to:
    // 1. Refresh the user's auth token to check verification status
    // 2. Only proceed if email is verified
    // 3. Show an error if not verified
  };
  
  // Render loading state
  if (loading) {
    return (
      <div className="bg-gray-100 min-h-screen">
        <main className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-700"></div>
            <span className="ml-2 text-gray-600">Loading...</span>
          </div>
        </main>
      </div>
    );
  }
  
  return (
    <div className="bg-gray-100 min-h-screen">
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-6 md:p-8">
          {/* Header */}
          <h1 className="text-2xl md:text-3xl font-medium text-gray-800 mb-2">
            {formStep === 1 ? 'Start Selling on Benchlot' : 
             formStep === 2 ? 'Tell us about your tool' : 
             formStep === 3 ? 'Set up your payment details' :
             'Review your listing'}
          </h1>
          <p className="text-gray-600 mb-6">
            {formStep === 1 ? 'Complete your seller profile to begin listing tools.' :
             formStep === 2 ? 'Provide details about the tool you want to sell.' :
             formStep === 3 ? 'Set up how you\'ll get paid when your tool sells.' :
             'Review your listing before publishing.'}
          </p>
          
          {/* Success message */}
          {successMessage && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md mb-6 flex items-start">
              <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
              <p>{successMessage}</p>
            </div>
          )}
          
          {/* Progress Steps */}
          <div className="mb-8">
            <div className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                formStep >= 1 ? 'bg-green-700 text-white' : 'bg-gray-200'
              }`}>
                1
              </div>
              <div className={`flex-1 h-1 mx-2 ${
                formStep >= 2 ? 'bg-green-700' : 'bg-gray-200'
              }`}></div>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                formStep >= 2 ? 'bg-green-700 text-white' : 'bg-gray-200'
              }`}>
                2
              </div>
              <div className={`flex-1 h-1 mx-2 ${
                formStep >= 3 ? 'bg-green-700' : 'bg-gray-200'
              }`}></div>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                formStep >= 3 ? 'bg-green-700 text-white' : 'bg-gray-200'
              }`}>
                3
              </div>
              <div className={`flex-1 h-1 mx-2 ${
                formStep >= 4 ? 'bg-green-700' : 'bg-gray-200'
              }`}></div>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                formStep >= 4 ? 'bg-green-700 text-white' : 'bg-gray-200'
              }`}>
                4
              </div>
            </div>
            <div className="flex justify-between mt-2 text-sm text-gray-600">
              <span>Seller Profile</span>
              <span>Tool Details</span>
              <span>Payout Details</span>
              <span>Review & Publish</span>
            </div>
          </div>
          
          {/* Email Verification Overlay */}
          {showEmailVerification ? (
            <div className="bg-yellow-50 border border-yellow-200 p-6 rounded-lg">
              <h2 className="text-lg font-medium text-yellow-800 mb-2">
                Verify your email to continue
              </h2>
              <p className="mb-4">
                We need to verify your email address before you can list tools on Benchlot.
                Please check your inbox for a verification email from us.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleSendVerificationEmail}
                  className="px-4 py-2 border border-yellow-600 text-yellow-800 rounded-md"
                >
                  Resend Verification Email
                </button>
                <button
                  onClick={handleCheckVerification}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-md"
                >
                  I've Verified My Email
                </button>
              </div>
            </div>
          ) : (
            <>
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-green-700"
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
                      <p className="text-sm text-green-600 mt-1">
                        Recommended: Faster verification for individuals
                      </p>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* City */}
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-green-700"
                        required
                        placeholder="Enter your city"
                      />
                    </div>

                    {/* State */}
                    <div>
                      <label className="block text-gray-700 font-medium mb-1" htmlFor="state">
                        State*
                      </label>
                      <select
                        id="state"
                        name="state"
                        value={formData.state}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-green-700 bg-white"
                        required
                      >
                        <option value="">Select a state</option>
                        {stateOptions.map(state => (
                          <option key={state.value} value={state.value}>{state.label}</option>
                        ))}
                      </select>
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-green-700"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-green-700"
                    />
                    <p className="text-sm text-gray-500 mt-1">Optional, but helps with local pickup</p>
                  </div>
                  
                  {/* Error message */}
                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mt-6 flex items-start">
                      <AlertTriangle className="h-5 w-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </div>
                  )}
                  
                  <div className="pt-4">
                    <button
                      type="submit"
                      className="w-full py-3 bg-green-700 text-white rounded-md hover:bg-green-800 font-medium flex items-center justify-center"
                    >
                      <span>Continue to Tool Details</span>
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </button>
                  </div>
                </form>
              )}
              
              {/* Step 2: Tool Listing Form */}
              {formStep === 2 && (
                <div className="space-y-6">
                  {/* Tool Information Section */}
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <h3 className="text-lg font-medium text-gray-800 mb-4">Tool Information</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Tool Name */}
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
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-green-700"
                          placeholder="e.g., Milwaukee M18 Drill"
                          required
                        />
                      </div>
                      
                      {/* Category */}
                      <div>
                        <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                          Category*
                        </label>
                        <select
                          id="category"
                          name="category"
                          value={formData.category}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-green-700 bg-white"
                          required
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
                          Condition*
                        </label>
                        <select
                          id="condition"
                          name="condition"
                          value={formData.condition}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-green-700 bg-white"
                          required
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
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-green-700"
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
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-green-700"
                          placeholder="e.g., M18 FUEL"
                        />
                      </div>
                    </div>
                    
                    {/* Description */}
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-green-700"
                        placeholder="Provide details about your tool..."
                        required
                      />
                    </div>
                  </div>
                  
                  {/* Pricing */}
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <h3 className="text-lg font-medium text-gray-800 mb-4">Pricing</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Current Price */}
                      <div>
                        <label htmlFor="current_price" className="block text-sm font-medium text-gray-700 mb-1">
                          Price*
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
                            className="w-full px-3 py-2 border border-gray-300 rounded-md pl-7 focus:outline-none focus:border-green-700"
                            placeholder="0"
                            required
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
                            className="w-full px-3 py-2 border border-gray-300 rounded-md pl-7 focus:outline-none focus:border-green-700"
                            placeholder="0"
                          />
                        </div>
                      </div>
                    </div>
                    
                    {/* Shipping Options */}
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
                        className="h-4 w-4 text-green-700 focus:ring-green-700 border-gray-300 rounded"
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
                            className="w-full px-3 py-2 border border-gray-300 rounded-md pl-7 focus:outline-none focus:border-green-700"
                            placeholder="0"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Next Steps Information */}
                  <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mt-6">
                    <div className="mb-4">
                      <div>
                        <h3 className="font-medium text-blue-700">Here's what comes next:</h3>
                      </div>
                      
                      <div className="mt-4">
                        <div className="flex">
                          {/* Status Icons Column */}
                          <div className="flex flex-col mr-2 space-y-4">
                            <div>
                              {user?.emailVerified ? (
                                <div className="bg-green-100 text-green-700 rounded-full p-0.5 h-5 w-5 flex items-center justify-center">
                                  <Check className="h-3.5 w-3.5" />
                                </div>
                              ) : (
                                <div className="bg-red-100 text-red-500 rounded-full p-0.5 h-5 w-5 flex items-center justify-center">
                                  <X className="h-3.5 w-3.5" />
                                </div>
                              )}
                            </div>
                            <div className="h-5 w-5"></div>
                            <div className="h-5 w-5"></div>
                          </div>
                          
                          {/* Numbers Column */}
                          <div className="flex flex-col items-center mr-2 space-y-4">
                            <div className="flex-shrink-0 bg-blue-100 text-blue-700 rounded-full h-5 w-5 flex items-center justify-center">
                              <span className="text-xs font-medium">1</span>
                            </div>
                            <div className="flex-shrink-0 bg-blue-100 text-blue-700 rounded-full h-5 w-5 flex items-center justify-center">
                              <span className="text-xs font-medium">2</span>
                            </div>
                            <div className="flex-shrink-0 bg-blue-100 text-blue-700 rounded-full h-5 w-5 flex items-center justify-center">
                              <span className="text-xs font-medium">3</span>
                            </div>
                          </div>
                          
                          {/* Text Column */}
                          <div className="flex flex-col space-y-4">
                            <div className="text-sm">
                              {user?.emailVerified ? (
                                <span className="text-green-700 font-medium">Email verified</span>
                              ) : (
                                <div>
                                  <span className="text-blue-700">Verify your email address</span>{" "}
                                  <button 
                                    onClick={handleSendVerificationEmail}
                                    className="text-blue-800 underline hover:text-blue-900 focus:outline-none"
                                  >
                                    Resend verification email
                                  </button>
                                </div>
                              )}
                            </div>
                            <div className="text-sm text-blue-700">
                              Set up your seller account and provide your payout details so you can get paid when your tool sells
                            </div>
                            <div className="text-sm text-blue-700">
                              Add photos, review your new listing and go live!
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Error message */}
                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mt-6 flex items-start">
                      <AlertTriangle className="h-5 w-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </div>
                  )}
                  
                  {/* Navigation Buttons */}
                  <div className="flex justify-between pt-4">
                    <button
                      type="button"
                      onClick={() => setFormStep(1)}
                      className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={handleFinalSubmit}
                      disabled={isSubmitting}
                      className="px-6 py-3 bg-green-700 text-white rounded-md hover:bg-green-800 font-medium flex items-center"
                    >
                      {isSubmitting ? (
                        <>
                          <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
                          Processing...
                        </>
                      ) : (
                        <>
                          <span>Payout Details</span>
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default SellerOnboardAndListPage;