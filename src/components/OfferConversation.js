/**
 * OfferConversation Component
 * Displays offer thread with messages and offer actions
 */
import React, { useState, useEffect, useRef } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  DollarSign, 
  Send, 
  ChevronRight, 
  ExternalLink,
  Loader,
  ThumbsUp,
  AlertTriangle,
  Clock
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useOffers } from '../firebase/hooks/useOffers';
import { useAuth } from '../firebase/hooks/useAuth';

const OfferConversation = ({ offer, onClose }) => {
  const { user } = useAuth();
  const { 
    getMessages, 
    addMessage, 
    acceptOffer, 
    counterOffer, 
    declineOffer, 
    markOfferAsRead,
    OfferStatus 
  } = useOffers();
  
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [counterAmount, setCounterAmount] = useState('');
  const [showCounterForm, setShowCounterForm] = useState(false);
  const [counterMessage, setCounterMessage] = useState('');
  const [processingAction, setProcessingAction] = useState(false);
  
  const messagesEndRef = useRef(null);
  const messageInputRef = useRef(null);
  
  const isBuyer = user?.uid === offer?.buyerId;
  const isSeller = user?.uid === offer?.sellerId;
  
  // Load messages and mark as read
  useEffect(() => {
    if (!offer?.id) return;
    
    const loadOfferMessages = async () => {
      try {
        setLoading(true);
        const offerMessages = await getMessages(offer.id);
        setMessages(offerMessages);
        setError('');
        
        // Mark messages as read
        await markOfferAsRead(offer.id);
      } catch (err) {
        console.error('Error loading messages:', err);
        setError('Failed to load messages. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    loadOfferMessages();
    
    // Set default counter offer (start at halfway between current price and list price)
    if (offer) {
      const priceIncrease = offer.originalPrice - offer.currentPrice;
      const halfwayPoint = Math.floor(offer.currentPrice + (priceIncrease / 2));
      
      if (isSeller) {
        // Seller counters higher, halfway between current offer and original price
        setCounterAmount(halfwayPoint.toString());
      } else {
        // Buyer counters lower, 5% more than their previous offer
        const lowerSuggestion = Math.floor(offer.currentPrice * 1.05);
        setCounterAmount(lowerSuggestion.toString());
      }
    }
  }, [offer, getMessages, markOfferAsRead, isSeller, isBuyer]);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Focus input when counter form is shown
  useEffect(() => {
    if (showCounterForm) {
      setTimeout(() => {
        messageInputRef.current?.focus();
      }, 100);
    }
  }, [showCounterForm]);
  
  // Format price for display
  const formatPrice = (price) => {
    if (!price && price !== 0) return '$0';
    
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(price);
  };
  
  // Format date for display
  const formatDate = (timestamp) => {
    if (!timestamp?.seconds) return '';
    
    const date = new Date(timestamp.seconds * 1000);
    
    // If today, show time only
    const today = new Date();
    if (date.toDateString() === today.toDateString()) {
      return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    }
    
    // If within the last 7 days, show day of week and time
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);
    if (date > lastWeek) {
      return date.toLocaleDateString([], { weekday: 'short' }) + 
             ' ' + 
             date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    }
    
    // Otherwise show date and time
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + 
           ' ' + 
           date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  };
  
  // Send a new message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim()) return;
    
    try {
      setProcessingAction(true);
      await addMessage(offer.id, newMessage.trim());
      setNewMessage('');
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message. Please try again.');
    } finally {
      setProcessingAction(false);
    }
  };
  
  // Handle accepting an offer
  const handleAcceptOffer = async () => {
    try {
      setProcessingAction(true);
      await acceptOffer(offer.id);
    } catch (err) {
      console.error('Error accepting offer:', err);
      setError('Failed to accept offer. Please try again.');
    } finally {
      setProcessingAction(false);
    }
  };
  
  // Handle countering an offer
  const handleCounterOffer = async (e) => {
    e.preventDefault();
    
    const amount = parseFloat(counterAmount);
    
    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid offer amount');
      return;
    }
    
    // For seller: can't counter lower than buyer's offer
    if (isSeller && amount <= offer.currentPrice) {
      setError('Your counter offer must be higher than the buyer\'s offer');
      return;
    }
    
    // For buyer: can't counter higher than seller's counter
    if (isBuyer && amount >= offer.currentPrice) {
      setError('Your counter offer must be lower than the seller\'s counter');
      return;
    }
    
    // For either: can't go beyond the original asking price
    if (amount > offer.originalPrice) {
      setError('Counter offer cannot exceed the original asking price');
      return;
    }
    
    try {
      setProcessingAction(true);
      await counterOffer(offer.id, amount, counterMessage);
      setShowCounterForm(false);
      setCounterMessage('');
    } catch (err) {
      console.error('Error countering offer:', err);
      setError('Failed to send counter offer. Please try again.');
    } finally {
      setProcessingAction(false);
    }
  };
  
  // Handle declining an offer
  const handleDeclineOffer = async () => {
    try {
      setProcessingAction(true);
      await declineOffer(offer.id);
    } catch (err) {
      console.error('Error declining offer:', err);
      setError('Failed to decline offer. Please try again.');
    } finally {
      setProcessingAction(false);
    }
  };
  
  // Determine if the offer can be acted upon
  const canActOnOffer = offer && [OfferStatus.PENDING, OfferStatus.COUNTERED].includes(offer.status);
  
  // Determine if user can accept/counter/decline based on role and offer state
  const canAcceptOffer = canActOnOffer && (
    (isBuyer && offer.status === OfferStatus.COUNTERED) || 
    (isSeller && offer.status === OfferStatus.PENDING)
  );
  
  const canCounterOffer = canActOnOffer && !showCounterForm && (
    (isBuyer && offer.status === OfferStatus.COUNTERED) ||
    (isSeller && offer.status === OfferStatus.PENDING)
  );
  
  const canDeclineOffer = canActOnOffer && !showCounterForm && (
    (isBuyer && offer.status === OfferStatus.PENDING) ||
    (isSeller && offer.status === OfferStatus.PENDING) ||
    (isSeller && offer.status === OfferStatus.COUNTERED)
  );
  
  // Determine if user can cancel their offer/counter
  const canCancelOffer = canActOnOffer && !showCounterForm && (
    (isBuyer && offer.status === OfferStatus.PENDING) ||
    (isSeller && offer.status === OfferStatus.COUNTERED)
  );
  
  // Handle canceling an offer
  const handleCancelOffer = async () => {
    try {
      setProcessingAction(true);
      // We'll reuse the decline function since the backend treats it the same way
      await declineOffer(offer.id, "Offer canceled by " + (isBuyer ? "buyer" : "seller"));
    } catch (err) {
      console.error('Error canceling offer:', err);
      setError('Failed to cancel offer. Please try again.');
    } finally {
      setProcessingAction(false);
    }
  };

  // Get status info display - now context-aware based on user role
  const getStatusInfo = () => {
    switch(offer?.status) {
      case OfferStatus.PENDING:
        if (isBuyer) {
          return {
            message: 'Waiting for seller to respond',
            icon: <Clock className="h-4 w-4 text-yellow-500 mr-1.5" />,
            color: 'text-yellow-800 bg-yellow-50'
          };
        } else {
          return {
            message: 'New offer received',
            icon: <ThumbsUp className="h-4 w-4 text-blue-500 mr-1.5" />,
            color: 'text-blue-800 bg-blue-50'
          };
        }
      case OfferStatus.ACCEPTED:
        return {
          message: isBuyer ? 'Seller accepted your offer!' : 'You accepted this offer',
          icon: <CheckCircle className="h-4 w-4 text-green-500 mr-1.5" />,
          color: 'text-green-800 bg-green-50'
        };
      case OfferStatus.DECLINED:
        return {
          message: isBuyer ? 'Seller declined your offer' : 'You declined this offer',
          icon: <XCircle className="h-4 w-4 text-red-500 mr-1.5" />,
          color: 'text-red-800 bg-red-50'
        };
      case OfferStatus.COUNTERED:
        if (isBuyer) {
          return {
            message: 'Seller made a counter offer',
            icon: <ThumbsUp className="h-4 w-4 text-blue-500 mr-1.5" />,
            color: 'text-blue-800 bg-blue-50'
          };
        } else {
          return {
            message: 'Waiting for buyer to respond',
            icon: <Clock className="h-4 w-4 text-yellow-500 mr-1.5" />,
            color: 'text-yellow-800 bg-yellow-50'
          };
        }
      case OfferStatus.EXPIRED:
        return {
          message: 'This offer has expired',
          icon: <AlertTriangle className="h-4 w-4 text-stone-500 mr-1.5" />,
          color: 'text-stone-800 bg-stone-50'
        };
      case OfferStatus.CANCELLED:
        return {
          message: isBuyer ? 'You cancelled this offer' : 'Buyer cancelled this offer',
          icon: <XCircle className="h-4 w-4 text-stone-500 mr-1.5" />,
          color: 'text-stone-800 bg-stone-50'
        };
      default:
        return {
          message: 'Loading...',
          icon: <Clock className="h-4 w-4 text-stone-500 mr-1.5" />,
          color: 'text-stone-800 bg-stone-50'
        };
    }
  };
  
  const statusInfo = getStatusInfo();
  
  if (!offer) return null;
  
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b p-4 flex items-center justify-between">
        <div>
          <h3 className="font-medium">{isBuyer ? 'Your offer on:' : 'Offer received:'}</h3>
          <div className="text-stone-600">
            <Link to={`/tools/${offer.toolId}`} className="hover:text-benchlot-primary flex items-center">
              {offer.toolTitle}
              <ExternalLink className="h-3 w-3 ml-1" />
            </Link>
          </div>
        </div>
        <div className="flex items-center">
          <span className={`text-sm px-3 py-1 rounded-full flex items-center ${statusInfo.color}`}>
            {statusInfo.icon}
            {offer.status.charAt(0).toUpperCase() + offer.status.slice(1)}
          </span>
        </div>
      </div>
      
      {/* Message thread */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <Loader className="h-6 w-6 text-benchlot-primary animate-spin" />
          </div>
        ) : (
          <>
            {/* Initial offer info */}
            <div className="bg-benchlot-accent bg-opacity-20 p-4 rounded-lg">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-sm text-stone-600">Original price</span>
                  <div className="font-medium text-lg">{formatPrice(offer.originalPrice)}</div>
                </div>
                <div className="text-right">
                  <span className="text-sm text-stone-600">Current offer</span>
                  <div className="font-medium text-lg text-benchlot-primary">{formatPrice(offer.currentPrice)}</div>
                </div>
              </div>
            </div>
            
            {/* Message bubbles */}
            {messages.map((msg, index) => {
              const isBuyerMessage = msg.senderId === offer.buyerId;
              const isCurrentUserMessage = msg.senderId === user?.uid;
              
              return (
                <div 
                  key={msg.id || index}
                  className={`flex ${isCurrentUserMessage ? 'justify-end' : 'justify-start'}`}
                >
                  <div 
                    className={`max-w-[80%] rounded-lg p-3 ${
                      isCurrentUserMessage 
                        ? 'bg-benchlot-primary text-white rounded-br-none' 
                        : 'bg-stone-100 text-stone-800 rounded-bl-none'
                    }`}
                  >
                    {/* Message header */}
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className={isCurrentUserMessage ? 'text-benchlot-accent-light' : 'text-stone-500'}>
                        {isCurrentUserMessage ? 'You' : (isBuyerMessage ? offer.buyerName || 'Buyer' : offer.sellerName || 'Seller')}
                      </span>
                      <span className={isCurrentUserMessage ? 'text-benchlot-accent-light' : 'text-stone-500'}>
                        {formatDate(msg.createdAt)}
                      </span>
                    </div>
                    
                    {/* Message content */}
                    {msg.messageType === 'offer' && (
                      <div>
                        <div className="text-lg font-semibold mb-1">
                          {formatPrice(msg.price)}
                        </div>
                        {msg.message && <p>{msg.message}</p>}
                      </div>
                    )}
                    
                    {msg.messageType === 'counter' && (
                      <div>
                        <div className="text-lg font-semibold mb-1">
                          Counter: {formatPrice(msg.price)}
                        </div>
                        {msg.message && <p>{msg.message}</p>}
                      </div>
                    )}
                    
                    {msg.messageType === 'accepted' && (
                      <div className="flex items-center">
                        <CheckCircle className={`h-5 w-5 mr-2 ${isCurrentUserMessage ? 'text-white' : 'text-green-500'}`} />
                        <span>Offer accepted{msg.message ? `: ${msg.message}` : ''}</span>
                      </div>
                    )}
                    
                    {msg.messageType === 'declined' && (
                      <div className="flex items-center">
                        <XCircle className={`h-5 w-5 mr-2 ${isCurrentUserMessage ? 'text-white' : 'text-red-500'}`} />
                        <span>Offer declined{msg.message ? `: ${msg.message}` : ''}</span>
                      </div>
                    )}
                    
                    {msg.messageType === 'message' && (
                      <p>{msg.message}</p>
                    )}
                  </div>
                </div>
              );
            })}
            
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
                {error}
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </>
        )}
      </div>
      
      {/* Counter offer form */}
      {showCounterForm && (
        <div className="p-6 border-t bg-white shadow-inner">
          <form onSubmit={handleCounterOffer}>
            <h3 className="text-lg font-medium text-stone-800 mb-4">Make a Counter Offer</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label htmlFor="originalPrice" className="block text-sm font-medium text-stone-500 mb-1">
                  Original Price
                </label>
                <div className="relative rounded-md bg-stone-100 p-2.5 pl-9 text-lg font-medium text-stone-600">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <DollarSign className="h-5 w-5 text-stone-400" />
                  </div>
                  {formatPrice(offer.originalPrice)}
                </div>
              </div>
              
              <div>
                <label htmlFor="currentOffer" className="block text-sm font-medium text-stone-500 mb-1">
                  Current Offer
                </label>
                <div className="relative rounded-md bg-stone-100 p-2.5 pl-9 text-lg font-medium text-stone-600">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <DollarSign className="h-5 w-5 text-stone-400" />
                  </div>
                  {formatPrice(offer.currentPrice)}
                </div>
              </div>
            </div>
            
            <div className="mb-4">
              <label htmlFor="counterAmount" className="block text-sm font-medium text-stone-700 mb-1">
                Your Counter Offer
              </label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <DollarSign className="h-5 w-5 text-benchlot-primary" />
                </div>
                <input
                  type="text"
                  id="counterAmount"
                  ref={messageInputRef}
                  className="focus:ring-benchlot-primary focus:border-benchlot-primary block w-full pl-10 pr-12 text-lg font-medium border-stone-300 rounded-md py-3"
                  placeholder="0"
                  value={counterAmount}
                  onChange={(e) => {
                    // Only allow numbers and decimals
                    const value = e.target.value.replace(/[^\d.]/g, '');
                    setCounterAmount(value);
                  }}
                  required
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <span className="text-stone-500">.00</span>
                </div>
              </div>
              
              {/* Guidance based on role */}
              <p className="mt-1 text-xs text-stone-500">
                {isSeller
                  ? "As the seller, your counter offer should be higher than the buyer's offer."
                  : "As the buyer, your counter offer should be lower than the seller's asking price."}
              </p>
            </div>
            
            <div className="mb-4">
              <label htmlFor="counterMessage" className="block text-sm font-medium text-stone-700 mb-1">
                Message (Optional)
              </label>
              <textarea
                id="counterMessage"
                rows="3"
                className="shadow-sm focus:ring-benchlot-primary focus:border-benchlot-primary block w-full border-stone-300 rounded-md"
                placeholder="Explain why you're offering this price..."
                value={counterMessage}
                onChange={(e) => setCounterMessage(e.target.value)}
              />
            </div>
            
            <div className="flex justify-end gap-3">
              <button
                type="button"
                className="px-4 py-2 border border-stone-300 rounded-md text-sm font-medium text-stone-700 bg-white hover:bg-stone-50 transition-colors"
                onClick={() => setShowCounterForm(false)}
                disabled={processingAction}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-benchlot-primary hover:bg-benchlot-secondary transition-colors disabled:opacity-50"
                disabled={processingAction}
              >
                {processingAction ? (
                  <>
                    <Loader className="animate-spin -ml-0.5 mr-2 h-4 w-4" />
                    Sending...
                  </>
                ) : (
                  'Send Counter Offer'
                )}
              </button>
            </div>
          </form>
        </div>
      )}
      
      {/* Footer with actions */}
      <div className="border-t p-4">
        {/* Offer actions (if applicable) */}
        {canActOnOffer && !showCounterForm && (
          <div className="flex justify-between items-center mb-4">
            <div className="flex gap-2">
              {/* Cancel button - shown to buyer with pending offer or seller with counter */}
              {canCancelOffer && (
                <button
                  type="button"
                  className="px-4 py-2 border border-stone-300 rounded-md text-sm font-medium text-stone-700 bg-white hover:bg-stone-50 transition-colors disabled:opacity-50"
                  onClick={handleCancelOffer}
                  disabled={processingAction}
                >
                  {processingAction ? <Loader className="h-4 w-4 mr-1 animate-spin" /> : 'Cancel Offer'}
                </button>
              )}
              
              {/* Decline button - shown mainly to seller receiving an offer */}
              {canDeclineOffer && !canCancelOffer && (
                <button
                  type="button"
                  className="px-4 py-2 border border-red-300 rounded-md text-sm font-medium text-red-700 bg-white hover:bg-red-50 transition-colors disabled:opacity-50"
                  onClick={handleDeclineOffer}
                  disabled={processingAction}
                >
                  {processingAction ? <Loader className="h-4 w-4 mr-1 animate-spin" /> : 'Decline'}
                </button>
              )}
            </div>
            
            <div className="flex gap-3">
              {/* Counter button - for both parties in appropriate states */}
              {canCounterOffer && (
                <button
                  type="button"
                  className="px-4 py-2 border border-blue-300 rounded-md text-sm font-medium text-blue-700 bg-white hover:bg-blue-50 transition-colors disabled:opacity-50"
                  onClick={() => setShowCounterForm(true)}
                  disabled={processingAction}
                >
                  {processingAction ? <Loader className="h-4 w-4 mr-1 animate-spin" /> : 'Make Counter Offer'}
                </button>
              )}
              
              {/* Accept button - for seller with pending offer or buyer with counter */}
              {canAcceptOffer && (
                <button
                  type="button"
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 transition-colors disabled:opacity-50"
                  onClick={handleAcceptOffer}
                  disabled={processingAction}
                >
                  {processingAction ? <Loader className="h-4 w-4 mr-1 animate-spin" /> : 'Accept Offer'}
                </button>
              )}
            </div>
          </div>
        )}
        
        {/* Complete purchase button - shown after acceptance */}
        {offer.status === OfferStatus.ACCEPTED && isBuyer && (
          <div className="mb-4">
            <Link 
              to={`/checkout?offerId=${offer.id}`}
              className="w-full inline-flex justify-center items-center px-4 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-benchlot-primary hover:bg-benchlot-secondary transition-colors"
            >
              Complete Purchase
            </Link>
          </div>
        )}
        
        {/* System Message based on status */}
        {canActOnOffer && !showCounterForm && (
          <div className="p-3 bg-stone-50 border border-stone-200 rounded-md mb-4">
            <p className="text-sm text-stone-600">
              {statusInfo.message}
              {isBuyer && offer.status === OfferStatus.PENDING && 
                ". You can cancel this offer until the seller responds."}
              {isSeller && offer.status === OfferStatus.PENDING && 
                ". You can accept, counter, or decline this offer."}
              {isBuyer && offer.status === OfferStatus.COUNTERED && 
                ". You can accept, counter, or decline this counter offer."}
              {isSeller && offer.status === OfferStatus.COUNTERED && 
                ". You can cancel your counter offer until the buyer responds."}
            </p>
          </div>
        )}
        
        {/* Message input - modernized */}
        {offer.status !== OfferStatus.DECLINED && 
         offer.status !== OfferStatus.CANCELLED && 
         offer.status !== OfferStatus.EXPIRED && 
         !showCounterForm && (
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              className="flex-1 focus:ring-benchlot-primary focus:border-benchlot-primary block w-full px-4 py-2.5 text-sm border-stone-300 rounded-lg shadow-sm"
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              disabled={processingAction}
            />
            <button
              type="submit"
              className="inline-flex items-center px-4 py-2.5 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-benchlot-primary hover:bg-benchlot-secondary transition-colors disabled:opacity-50"
              disabled={!newMessage.trim() || processingAction}
            >
              {processingAction ? (
                <Loader className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </form>
        )}
        
        {/* Closed offer message */}
        {(offer.status === OfferStatus.DECLINED || 
          offer.status === OfferStatus.CANCELLED || 
          offer.status === OfferStatus.EXPIRED) && (
          <div className="text-sm bg-stone-50 border border-stone-200 p-4 rounded-lg text-center">
            <p className="text-stone-600 font-medium">This conversation is closed.</p>
            <p className="text-stone-500 mt-1">
              {offer.status === OfferStatus.DECLINED && 'The offer was declined.'}
              {offer.status === OfferStatus.CANCELLED && 'The offer was cancelled.'}
              {offer.status === OfferStatus.EXPIRED && 'The offer has expired.'}
            </p>
            {isBuyer && (
              <div className="mt-3">
                <Link 
                  to={`/tools/${offer.toolId}`}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-benchlot-primary hover:text-benchlot-secondary"
                >
                  Return to item
                </Link>
                <button
                  onClick={() => setShowCounterForm(true)}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-benchlot-primary hover:text-benchlot-secondary"
                >
                  Make new offer
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default OfferConversation;