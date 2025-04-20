/**
 * MakeOfferModal Component
 * Modal for users to submit offers on tools
 */
import React, { useState, useEffect } from 'react';
import { X, DollarSign, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import { useOffers } from '../firebase/hooks/useOffers';
import { useAuth } from '../firebase/hooks/useAuth';

const MakeOfferModal = ({ 
  isOpen, 
  onClose, 
  tool, 
  onSuccess 
}) => {
  const { user } = useAuth();
  const { createOffer } = useOffers();
  
  const [offerAmount, setOfferAmount] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      // Set initial offer amount to 90% of list price
      if (tool?.price) {
        const suggestedOffer = Math.floor(tool.price * 0.9);
        setOfferAmount(suggestedOffer.toString());
      } else {
        setOfferAmount('');
      }
      setMessage('');
      setError('');
      setSuccess(false);
    }
  }, [isOpen, tool]);
  
  // Close on escape key
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    
    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
    }
    
    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, onClose]);
  
  // Format price for display
  const formatPrice = (price) => {
    if (!price) return '$0';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(price);
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!user) {
      setError('You must be logged in to make an offer.');
      return;
    }
    
    if (tool.sellerId === user.uid) {
      setError('You cannot make an offer on your own listing.');
      return;
    }
    
    const amount = parseFloat(offerAmount);
    
    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid offer amount.');
      return;
    }
    
    // Don't allow offers higher than the asking price
    if (amount >= tool.price) {
      setError('Your offer should be lower than the asking price.');
      return;
    }
    
    // Don't allow offers less than 50% of asking price
    if (amount < tool.price * 0.5) {
      setError('Please offer at least 50% of the asking price.');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      const offerData = {
        toolId: tool.id,
        toolTitle: tool.title,
        sellerId: tool.sellerId,
        originalPrice: tool.price,
        price: amount,
        message: message.trim()
      };
      
      await createOffer(offerData);
      
      setSuccess(true);
      
      // Close modal after success if callback provided
      if (onSuccess) {
        setTimeout(() => {
          onSuccess();
        }, 1500);
      }
    } catch (err) {
      console.error('Error creating offer:', err);
      setError(err.message || 'Failed to submit offer. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onClose}></div>
        
        <div className="relative bg-white rounded-xl max-w-lg w-full mx-auto shadow-xl overflow-hidden">
          {/* Header */}
          <div className="flex justify-between items-center p-6 border-b border-stone-200 bg-stone-50">
            <h3 className="text-2xl font-serif font-semibold text-stone-900">Make an Offer</h3>
            <button 
              onClick={onClose}
              className="text-stone-400 hover:text-stone-500 focus:outline-none p-1 rounded-full hover:bg-stone-200 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          
          {/* Content */}
          <div className="p-6 space-y-4">
            {!success ? (
              <form onSubmit={handleSubmit}>
                {/* Tool info */}
                <div className="flex items-center mb-6 p-4 bg-stone-50 rounded-lg border border-stone-100">
                  <div className="w-20 h-20 bg-stone-100 rounded overflow-hidden flex-shrink-0 flex items-center justify-center mr-4">
                    {tool?.images?.[0] ? (
                      <img 
                        src={tool.images[0]} 
                        alt={tool.title} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-stone-400 text-sm">No image</div>
                    )}
                  </div>
                  <div>
                    <h4 className="font-medium text-lg text-stone-800 mb-1">{tool?.title || tool?.name}</h4>
                    <div className="text-benchlot-primary text-lg font-medium">Asking: {formatPrice(tool?.price)}</div>
                  </div>
                </div>
                
                {/* Offer amount */}
                <div className="mb-6">
                  <label htmlFor="offerAmount" className="block text-base font-medium text-stone-800 mb-2">
                    Your Offer
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <span className="text-stone-600 text-lg font-medium">$</span>
                    </div>
                    <input
                      type="text"
                      name="offerAmount"
                      id="offerAmount"
                      className="focus:ring-benchlot-primary focus:border-benchlot-primary block w-full pl-10 py-3 text-lg font-medium border border-stone-300 rounded-md shadow-sm"
                      placeholder="0"
                      autoFocus
                      value={offerAmount}
                      onChange={(e) => {
                        // Only allow numbers and decimals
                        const value = e.target.value.replace(/[^\d.]/g, '');
                        setOfferAmount(value);
                      }}
                      required
                    />
                    <div className="absolute right-0 top-0 bottom-0 bg-stone-50 px-4 flex items-center font-medium text-stone-600 border-l border-stone-300 rounded-r-md">
                      + Shipping
                    </div>
                  </div>
                  
                  {/* Price guidance - similar to Reverb's estimated value */}
                  <div className="mt-2 bg-stone-50 border-l-4 border-benchlot-primary p-3 rounded-md">
                    <p className="text-stone-700">
                      <span className="font-medium">Suggested offer:</span> {formatPrice(tool?.price * 0.85)} - {formatPrice(tool?.price * 0.95)}
                    </p>
                  </div>
                </div>
                
                {/* Message */}
                <div className="mb-2">
                  <div className="flex justify-between items-center mb-2">
                    <label htmlFor="message" className="block text-base font-medium text-stone-800">
                      Share a message with the seller
                    </label>
                    <span className="text-stone-500 text-sm">OPTIONAL</span>
                  </div>
                  <textarea
                    id="message"
                    rows="4"
                    className="shadow-sm focus:ring-benchlot-primary focus:border-benchlot-primary block w-full text-base border border-stone-300 rounded-md"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                  />
                  <p className="mt-1 text-stone-500 text-sm">
                    Tips: Share why you're interested or how you'll use it. Sellers are more likely to accept offers with personalized messages.
                  </p>
                </div>
                
                {/* Error Message */}
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-md flex items-start mb-4">
                    <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mr-2 mt-0.5" />
                    <span className="text-sm text-red-800">{error}</span>
                  </div>
                )}
                
                {/* Buttons */}
                <div className="flex justify-between gap-4 mt-8 border-t border-stone-200 pt-6">
                  <button
                    type="button"
                    className="flex-1 py-3 px-6 font-medium text-base border border-stone-300 rounded-md bg-white text-stone-700 hover:bg-stone-50 transition-colors"
                    onClick={onClose}
                    disabled={loading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 px-6 font-medium text-base border border-transparent rounded-md text-white bg-benchlot-primary hover:bg-benchlot-secondary transition-colors disabled:opacity-70 disabled:cursor-not-allowed inline-flex justify-center items-center"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader className="animate-spin -ml-1 mr-2 h-5 w-5" />
                        Submitting...
                      </>
                    ) : (
                      'Submit Offer'
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <div className="py-8">
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-6">
                  <CheckCircle className="h-10 w-10 text-green-600" />
                </div>
                <h3 className="text-2xl font-medium text-stone-900 mb-3 text-center">Offer Submitted!</h3>
                <div className="bg-stone-50 border border-stone-200 rounded-md p-4 mb-6">
                  <p className="text-stone-600 mb-2">
                    Your offer of <span className="font-medium text-stone-800">{formatPrice(parseFloat(offerAmount))}</span> for {tool?.title} has been sent to the seller.
                  </p>
                  <p className="text-stone-600">
                    They'll be notified right away. You can view and manage this offer in your messages.
                  </p>
                </div>
                <div className="flex justify-center">
                  <button
                    type="button"
                    className="py-3 px-8 border border-transparent rounded-md text-white bg-benchlot-primary hover:bg-benchlot-secondary transition-colors font-medium text-base"
                    onClick={onClose}
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MakeOfferModal;