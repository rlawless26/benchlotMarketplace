import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  ArrowRight, 
  CheckCircle, 
  Mail,
  Camera,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../firebase/hooks/useAuth';
import { useSeller } from '../firebase/hooks/useSeller';
import { toolCategories, toolConditions } from '../firebase/models/toolModel';

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
  const [formStep, setFormStep] = useState(1); // 1 = seller info, 2 = tool details, 3 = review
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [showEmailVerification, setShowEmailVerification] = useState(false);
  
  // Combined form data
  const [formData, setFormData] = useState({
    // Seller profile
    sellerName: '',
    sellerType: 'individual',
    location: 'Boston, MA',
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
  });
  
  // Load draft tool name and populate user data
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
        // If not loading and no user, redirect to login
        navigate('/login', { state: { from: '/seller/onboard-and-list' } });
      }
    }
  }, [user, loading, navigate]);
  
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
  
  // Handle tool listing form submission (step 2)
  const handleToolListingSubmit = (e) => {
    e.preventDefault();
    
    // Validate tool listing form
    const requiredFields = ['toolName', 'description', 'category', 'condition', 'current_price'];
    const missingFields = requiredFields.filter(field => !formData[field]);
    
    if (missingFields.length > 0) {
      setError(`Please fill out all required fields: ${missingFields.join(', ')}`);
      return;
    }
    
    // Proceed to review step
    setError(null);
    setFormStep(3);
  };
  
  // Handle final submission (step 3)
  const handleFinalSubmit = async () => {
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Check if email is verified
      if (user && !user.emailVerified) {
        setShowEmailVerification(true);
        setIsSubmitting(false);
        return;
      }
      
      // Create Stripe Connect account
      const sellerAccountResult = await createSellerAccount({
        sellerName: formData.sellerName,
        sellerType: formData.sellerType,
        location: formData.location,
        contactEmail: formData.contactEmail,
        contactPhone: formData.contactPhone
      });
      
      if (!sellerAccountResult.success) {
        throw new Error(sellerAccountResult.error || 'Failed to create seller account');
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
        age: formData.age
      };
      
      localStorage.setItem('pendingToolListing', JSON.stringify(toolData));
      
      // Redirect to Stripe onboarding
      window.location.href = sellerAccountResult.url;
      
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
    // Reload user to check verification status
    // In a real implementation, this would refresh the user's token
    
    // For now, we'll just proceed with the flow
    setShowEmailVerification(false);
    handleFinalSubmit();
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
             'Review your listing'}
          </h1>
          <p className="text-gray-600 mb-6">
            {formStep === 1 ? 'Complete your seller profile to begin listing tools.' :
             formStep === 2 ? 'Provide details about the tool you want to sell.' :
             'Review your information before submitting.'}
          </p>
          
          {/* Error message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
              {error}
            </div>
          )}
          
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
                formStep >= 1 ? 'bg-green-500 text-white' : 'bg-gray-200'
              }`}>
                1
              </div>
              <div className={`flex-1 h-1 mx-2 ${
                formStep >= 2 ? 'bg-green-500' : 'bg-gray-200'
              }`}></div>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                formStep >= 2 ? 'bg-green-500 text-white' : 'bg-gray-200'
              }`}>
                2
              </div>
              <div className={`flex-1 h-1 mx-2 ${
                formStep >= 3 ? 'bg-green-500' : 'bg-gray-200'
              }`}></div>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                formStep >= 3 ? 'bg-green-500 text-white' : 'bg-gray-200'
              }`}>
                3
              </div>
            </div>
            <div className="flex justify-between mt-2 text-sm text-gray-600">
              <span>Seller Profile</span>
              <span>Tool Details</span>
              <span>Review & Submit</span>
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
                  
                  <div>
                    <label className="block text-gray-700 font-medium mb-1" htmlFor="location">
                      Location*
                    </label>
                    <select
                      id="location"
                      name="location"
                      value={formData.location}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-green-700 bg-white"
                      required
                    >
                      <option value="Boston, MA">Boston, MA</option>
                      <option value="Cambridge, MA">Cambridge, MA</option>
                      <option value="Somerville, MA">Somerville, MA</option>
                      <option value="Medford, MA">Medford, MA</option>
                      <option value="Brookline, MA">Brookline, MA</option>
                    </select>
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
                <form onSubmit={handleToolListingSubmit} className="space-y-6">
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
                          className="w-full border border-gray-300 rounded-md px-3 py-2"
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
                          className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white"
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
                          className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white"
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
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
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
                            className="w-full border border-gray-300 rounded-md pl-7 pr-3 py-2"
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
                            className="w-full border border-gray-300 rounded-md pl-7 pr-3 py-2"
                            placeholder="0"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  
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
                      type="submit"
                      className="px-6 py-2 bg-green-700 text-white rounded-md hover:bg-green-800 font-medium"
                    >
                      Preview Listing
                    </button>
                  </div>
                </form>
              )}
              
              {/* Step 3: Review */}
              {formStep === 3 && (
                <div className="space-y-6">
                  {/* Seller Info Review */}
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="text-lg font-medium text-gray-800">Seller Information</h3>
                      <button 
                        onClick={() => setFormStep(1)} 
                        className="text-sm text-green-700 hover:text-green-800"
                      >
                        Edit
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
                      <div>
                        <span className="text-sm text-gray-500">Name:</span>
                        <p className="font-medium">{formData.sellerName}</p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-500">Type:</span>
                        <p className="font-medium capitalize">{formData.sellerType}</p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-500">Location:</span>
                        <p className="font-medium">{formData.location}</p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-500">Email:</span>
                        <p className="font-medium">{formData.contactEmail}</p>
                      </div>
                      {formData.contactPhone && (
                        <div>
                          <span className="text-sm text-gray-500">Phone:</span>
                          <p className="font-medium">{formData.contactPhone}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Tool Info Review */}
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="text-lg font-medium text-gray-800">Tool Information</h3>
                      <button 
                        onClick={() => setFormStep(2)} 
                        className="text-sm text-green-700 hover:text-green-800"
                      >
                        Edit
                      </button>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium text-lg">{formData.toolName}</h4>
                        <div className="flex gap-2 text-sm text-gray-500 mb-2">
                          <span>{formData.category}</span>
                          {formData.brand && <span>• {formData.brand}</span>}
                          {formData.model && <span>• {formData.model}</span>}
                        </div>
                        <p className="text-green-700 font-medium mb-2">${parseFloat(formData.current_price).toFixed(2)}</p>
                        <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                          {formData.condition}
                        </span>
                      </div>
                      
                      <p className="text-gray-700">{formData.description}</p>
                      
                      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 flex items-start">
                        <Camera className="h-5 w-5 text-yellow-700 mr-2 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-yellow-700">
                          You'll be able to add photos after completing setup.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Final Submit */}
                  <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                    <div className="flex items-start mb-4">
                      <Mail className="h-5 w-5 text-blue-700 mr-2 flex-shrink-0 mt-0.5" />
                      <div>
                        <h3 className="font-medium text-blue-700">Next steps after submitting:</h3>
                        <p className="text-sm text-blue-700 mt-1">
                          {!user?.emailVerified && 
                            "1. Verify your email address (we'll send you a verification link)"}
                        </p>
                        <p className="text-sm text-blue-700 mt-1">
                          {!user?.emailVerified ? "2. " : "1. "}
                          Set up your seller account through Stripe, our payment processor
                        </p>
                        <p className="text-sm text-blue-700 mt-1">
                          {!user?.emailVerified ? "3. " : "2. "}
                          Your listing will go live after these steps are completed
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex justify-between">
                      <button
                        type="button"
                        onClick={() => setFormStep(2)}
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
                            Submit Listing
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </>
                        )}
                      </button>
                    </div>
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