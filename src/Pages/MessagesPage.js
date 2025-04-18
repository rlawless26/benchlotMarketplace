/**
 * MessagesPage Component
 * Main page for offers and messages
 */
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { 
  MessageSquare, 
  Search, 
  X, 
  CheckCircle, 
  XCircle, 
  Clock, 
  DollarSign,
  ShoppingBag,
  Package,
  Loader,
  User,
  ArrowLeft,
  Bell,
  Send,
  Filter,
  MailOpen,
  Archive,
  Tag,
  MessageCircle
} from 'lucide-react';

import { useAuth } from '../firebase/hooks/useAuth';
import { useOffers } from '../firebase/hooks/useOffers';
import { useMessages } from '../firebase/hooks/useMessages';
import OfferConversation from '../components/OfferConversation';
import ConversationView from '../components/ConversationView';

const MessagesPage = () => {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const { 
    activeOffers, 
    buyerOffers, 
    sellerOffers, 
    loading: offersLoading,
    error: offersError,
    OfferStatus
  } = useOffers();
  
  const params = useParams();
  const conversationId = params?.conversationId;
  
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState('all');
  const [messageType, setMessageType] = useState('offers'); // 'offers' or 'direct'
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredOffers, setFilteredOffers] = useState([]);
  const [selectedOfferId, setSelectedOfferId] = useState(null);
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [selectedConversationId, setSelectedConversationId] = useState(conversationId || null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showConversation, setShowConversation] = useState(false);
  
  // Use the messages hook for direct messaging
  const { 
    conversations, 
    activeConversation, 
    messages, 
    loading: messagesLoading, 
    error: messagesError,
    unreadCount,
    markAsRead
  } = useMessages(selectedConversationId);
  
  // Track both loading states
  const isLoading = authLoading || (offersLoading && messagesLoading && !filteredOffers.length && !conversations.length);
  
  // Check if user is authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated()) {
      navigate('/login', { state: { from: '/messages' } });
    }
  }, [authLoading, isAuthenticated, navigate]);
  
  // Set conversation ID from URL params
  useEffect(() => {
    if (conversationId) {
      setSelectedConversationId(conversationId);
      setMessageType('direct');
      setSelectedOfferId(null);
      setSelectedOffer(null);
    }
  }, [conversationId]);
  
  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  
  // Apply filters based on tabs and search
  useEffect(() => {
    let filtered = [];
    
    switch (activeTab) {
      case 'all':
        filtered = activeOffers;
        break;
      case 'buying':
        filtered = buyerOffers;
        break;
      case 'selling':
        filtered = sellerOffers;
        break;
      default:
        filtered = activeOffers;
    }
    
    // Apply search filter
    if (searchQuery.trim() && messageType === 'offers') {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(offer => 
        offer.toolTitle?.toLowerCase().includes(query)
      );
    }
    
    setFilteredOffers(filtered);
    
    // If selected offer is not in filtered list, deselect it
    if (selectedOfferId && !filtered.some(o => o.id === selectedOfferId)) {
      setSelectedOfferId(null);
      setSelectedOffer(null);
    }
  }, [activeTab, activeOffers, buyerOffers, sellerOffers, searchQuery, selectedOfferId, messageType]);
  
  // Update selected offer when ID changes
  useEffect(() => {
    if (selectedOfferId) {
      const offer = filteredOffers.find(o => o.id === selectedOfferId);
      setSelectedOffer(offer || null);
      
      if (isMobile) {
        setShowConversation(true);
      }
    } else {
      setSelectedOffer(null);
      
      if (isMobile && !selectedConversationId) {
        setShowConversation(false);
      }
    }
  }, [selectedOfferId, filteredOffers, isMobile, selectedConversationId]);
  
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
    if (!timestamp) return '';
    
    // Convert Firebase timestamp if needed
    const date = timestamp.seconds 
      ? new Date(timestamp.seconds * 1000) 
      : new Date(timestamp);
      
    const now = new Date();
    
    // If today, show time only
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    }
    
    // If within the last 7 days, show day of week
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);
    if (date > lastWeek) {
      return date.toLocaleDateString([], { weekday: 'short' });
    }
    
    // Otherwise show date
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };
  
  // Get status badge for an offer
  const getStatusBadge = (status) => {
    switch (status) {
      case OfferStatus.PENDING:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </span>
        );
      case OfferStatus.ACCEPTED:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Accepted
          </span>
        );
      case OfferStatus.COUNTERED:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
            <DollarSign className="h-3 w-3 mr-1" />
            Countered
          </span>
        );
      case OfferStatus.DECLINED:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
            <XCircle className="h-3 w-3 mr-1" />
            Declined
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-stone-100 text-stone-800">
            <Clock className="h-3 w-3 mr-1" />
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </span>
        );
    }
  };
  
  // Handle selecting a direct conversation
  const handleSelectConversation = (conversation) => {
    setSelectedConversationId(conversation.id);
    setSelectedOfferId(null);
    setSelectedOffer(null);
    setMessageType('direct');
    
    if (isMobile) {
      setShowConversation(true);
    }
    
    // Update URL without reloading
    navigate(`/messages/conversation/${conversation.id}`, { replace: true });
    
    // Mark as read when selected
    if (conversation.hasUnread) {
      markAsRead(conversation.id);
    }
  };
  
  // Handle selecting an offer
  const handleSelectOffer = (offerId) => {
    setSelectedOfferId(offerId);
    setSelectedConversationId(null);
    setMessageType('offers');
    
    // Update URL without reloading
    navigate('/messages', { replace: true });
  };
  
  // Handle back button in mobile view
  const handleBackToList = () => {
    setSelectedOfferId(null);
    setSelectedOffer(null);
    setSelectedConversationId(null);
    setShowConversation(false);
    
    // Update URL without reloading
    navigate('/messages', { replace: true });
  };
  
  // Loading state
  if (isLoading) {
    return (
      <div className="bg-stone-50 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <h1 className="text-3xl font-serif font-medium text-stone-800 mb-2">Messages</h1>
          <p className="text-stone-600 mb-6">View and manage your offers and messages</p>
          
          <div className="bg-white rounded-lg shadow-md p-8 flex justify-center">
            <Loader className="h-8 w-8 text-benchlot-primary animate-spin" />
          </div>
        </div>
      </div>
    );
  }
  
  // Mobile conversation view
  if (isMobile && showConversation && (selectedOffer || selectedConversationId)) {
    return (
      <div className="bg-stone-50 min-h-screen flex flex-col">
        {/* Mobile header */}
        <div className="bg-white border-b py-4 px-4">
          <button 
            onClick={handleBackToList}
            className="inline-flex items-center text-stone-600 hover:text-benchlot-primary"
          >
            <ArrowLeft className="h-5 w-5 mr-1.5" />
            Back to Messages
          </button>
        </div>
        
        {/* Conversation container */}
        <div className="flex-1 flex flex-col">
          {selectedOffer ? (
            <OfferConversation 
              offer={selectedOffer} 
              onClose={handleBackToList} 
            />
          ) : selectedConversationId ? (
            <ConversationView 
              conversationId={selectedConversationId}
              onClose={handleBackToList}
            />
          ) : null}
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-stone-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-serif font-medium text-stone-800 mb-2">Messages</h1>
        <p className="text-stone-600 mb-6">View and manage your offers and messages</p>
        
        {/* Type selector */}
        <div className="bg-white rounded-t-lg shadow-md overflow-hidden mb-0.5">
          <div className="flex border-b">
            <button
              className={`flex-1 py-3 px-4 text-center font-medium text-sm ${
                messageType === 'offers' ? 'text-benchlot-primary border-b-2 border-benchlot-primary' : 'text-stone-600 hover:text-stone-900'
              }`}
              onClick={() => {
                setMessageType('offers');
                setSelectedConversationId(null);
                // Update URL without reloading
                navigate('/messages', { replace: true });
              }}
            >
              <span className="flex items-center justify-center">
                <DollarSign className="h-4 w-4 mr-1.5" />
                Offers
              </span>
            </button>
            <button
              className={`flex-1 py-3 px-4 text-center font-medium text-sm ${
                messageType === 'direct' ? 'text-benchlot-primary border-b-2 border-benchlot-primary' : 'text-stone-600 hover:text-stone-900'
              }`}
              onClick={() => {
                setMessageType('direct');
                setSelectedOfferId(null);
                setSelectedOffer(null);
              }}
            >
              <span className="flex items-center justify-center">
                <MessageCircle className="h-4 w-4 mr-1.5" />
                Direct Messages
                {unreadCount > 0 && (
                  <span className="ml-1.5 bg-benchlot-primary text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </span>
            </button>
          </div>
        </div>
        
        <div className="bg-white rounded-b-lg shadow-md overflow-hidden">
          <div className="grid md:grid-cols-3 h-[600px]">
            {/* Left sidebar with conversation list */}
            <div className="md:col-span-1 border-r">
              {/* Tabs and search bar */}
              <div className="border-b">
                {messageType === 'offers' && (
                  <div className="flex border-b">
                    <button
                      className={`flex-1 py-3 px-4 text-center font-medium text-sm ${
                        activeTab === 'all' ? 'text-benchlot-primary border-b-2 border-benchlot-primary' : 'text-stone-600 hover:text-stone-900'
                      }`}
                      onClick={() => setActiveTab('all')}
                    >
                      All
                    </button>
                    <button
                      className={`flex-1 py-3 px-4 text-center font-medium text-sm ${
                        activeTab === 'buying' ? 'text-benchlot-primary border-b-2 border-benchlot-primary' : 'text-stone-600 hover:text-stone-900'
                      }`}
                      onClick={() => setActiveTab('buying')}
                    >
                      Buying
                    </button>
                    <button
                      className={`flex-1 py-3 px-4 text-center font-medium text-sm ${
                        activeTab === 'selling' ? 'text-benchlot-primary border-b-2 border-benchlot-primary' : 'text-stone-600 hover:text-stone-900'
                      }`}
                      onClick={() => setActiveTab('selling')}
                    >
                      Selling
                    </button>
                  </div>
                )}
                <div className="p-3">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder={`Search ${messageType === 'offers' ? 'offers' : 'messages'}...`}
                      className="w-full pl-9 pr-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-1 focus:ring-benchlot-primary focus:border-benchlot-primary text-sm"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-stone-400" />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-stone-400 hover:text-stone-500"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Message list */}
              <div className="overflow-y-auto h-[calc(600px-106px)]">
                {/* Error states */}
                {messageType === 'offers' && offersError && (
                  <div className="p-4 text-red-800 bg-red-50">
                    {offersError}
                  </div>
                )}
                {messageType === 'direct' && messagesError && (
                  <div className="p-4 text-red-800 bg-red-50">
                    {messagesError}
                  </div>
                )}
                
                {/* Offers empty state */}
                {messageType === 'offers' && filteredOffers.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                    <MessageSquare className="h-12 w-12 text-stone-300 mb-3" />
                    <h3 className="text-lg font-medium text-stone-700 mb-1">No offers</h3>
                    <p className="text-stone-500 text-sm max-w-xs">
                      {searchQuery 
                        ? 'No offers match your search. Try different keywords.' 
                        : activeTab === 'all'
                          ? 'You don\'t have any offers yet.'
                          : activeTab === 'buying'
                            ? 'You haven\'t made any offers yet.'
                            : 'You haven\'t received any offers yet.'
                      }
                    </p>
                    <div className="mt-6">
                      <Link to="/marketplace" className="px-4 py-2 bg-benchlot-primary text-white rounded-md">
                        Browse Tools
                      </Link>
                    </div>
                  </div>
                )}
                
                {/* Direct messages empty state */}
                {messageType === 'direct' && conversations.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                    <MessageCircle className="h-12 w-12 text-stone-300 mb-3" />
                    <h3 className="text-lg font-medium text-stone-700 mb-1">No messages</h3>
                    <p className="text-stone-500 text-sm max-w-xs">
                      {searchQuery 
                        ? 'No messages match your search. Try different keywords.' 
                        : 'You don\'t have any direct messages yet.'
                      }
                    </p>
                    <div className="mt-6">
                      <Link to="/marketplace" className="px-4 py-2 bg-benchlot-primary text-white rounded-md">
                        Find Users to Message
                      </Link>
                    </div>
                  </div>
                )}
                
                {/* Offers list */}
                {messageType === 'offers' && filteredOffers.length > 0 && (
                  <ul className="divide-y divide-stone-200">
                    {filteredOffers.map((offer) => {
                      const isBuyer = user?.uid === offer.buyerId;
                      const hasUnreadMessages = isBuyer 
                        ? offer.hasUnreadMessagesBuyer 
                        : offer.hasUnreadMessagesSeller;
                      
                      return (
                        <li 
                          key={offer.id}
                          className={`hover:bg-stone-50 cursor-pointer ${
                            selectedOfferId === offer.id ? 'bg-benchlot-accent-light' : ''
                          } ${hasUnreadMessages ? 'border-l-4 border-benchlot-primary' : ''}`}
                          onClick={() => handleSelectOffer(offer.id)}
                        >
                          <div className="p-4">
                            <div className="flex justify-between items-start mb-1">
                              <div className="flex items-center">
                                {isBuyer ? (
                                  <ShoppingBag className="h-5 w-5 text-benchlot-primary mr-2" />
                                ) : (
                                  <Package className="h-5 w-5 text-benchlot-accent-dark mr-2" />
                                )}
                                <span className="font-medium truncate max-w-[140px]">
                                  {offer.toolTitle}
                                </span>
                              </div>
                              <span className="text-xs text-stone-500">
                                {formatDate(offer.updatedAt)}
                              </span>
                            </div>
                            
                            <div className="flex justify-between items-center mb-1">
                              <div className="text-sm text-stone-600">
                                {isBuyer ? 'Your offer:' : 'Their offer:'}
                              </div>
                              <div className="font-medium">
                                {formatPrice(offer.currentPrice)}
                              </div>
                            </div>
                            
                            <div className="flex justify-between items-center">
                              <div className="text-xs text-stone-500">
                                {isBuyer ? 'To Seller' : 'From Buyer'}
                              </div>
                              {getStatusBadge(offer.status)}
                            </div>
                            
                            {hasUnreadMessages && (
                              <div className="mt-2 flex justify-end">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-benchlot-primary text-white">
                                  <Bell className="h-3 w-3 mr-1" />
                                  New message
                                </span>
                              </div>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
                
                {/* Direct messages list */}
                {messageType === 'direct' && conversations.length > 0 && (
                  <ul className="divide-y divide-stone-200">
                    {conversations.map((conversation) => {
                      // Find the other user in the conversation
                      const otherParticipant = conversation.participants.find(id => id !== user?.uid);
                      const hasUnread = conversation.hasUnread;
                      
                      return (
                        <li 
                          key={conversation.id}
                          className={`hover:bg-stone-50 cursor-pointer ${
                            selectedConversationId === conversation.id ? 'bg-benchlot-accent-light' : ''
                          } ${hasUnread ? 'border-l-4 border-benchlot-primary' : ''}`}
                          onClick={() => handleSelectConversation(conversation)}
                        >
                          <div className="p-4">
                            <div className="flex justify-between items-start mb-1">
                              <div className="flex items-center">
                                <User className="h-5 w-5 text-benchlot-primary mr-2" />
                                <span className="font-medium truncate max-w-[140px]">
                                  {conversation.participantNames?.[otherParticipant] || "User"}
                                </span>
                              </div>
                              <span className="text-xs text-stone-500">
                                {formatDate(conversation.lastMessageAt?.toDate?.() || conversation.lastMessageAt)}
                              </span>
                            </div>
                            
                            <div className="text-sm text-stone-600 line-clamp-1 mb-1">
                              {conversation.lastMessageText || "No messages yet"}
                            </div>
                            
                            {hasUnread && (
                              <div className="mt-2 flex justify-end">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-benchlot-primary text-white">
                                  <MailOpen className="h-3 w-3 mr-1" />
                                  Unread
                                </span>
                              </div>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
            
            {/* Right side with conversation */}
            <div className="hidden md:flex md:col-span-2 flex-col">
              {selectedOffer ? (
                <OfferConversation 
                  offer={selectedOffer} 
                  onClose={() => setSelectedOfferId(null)} 
                />
              ) : selectedConversationId ? (
                <ConversationView 
                  conversationId={selectedConversationId}
                  onClose={() => {
                    setSelectedConversationId(null);
                    navigate('/messages', { replace: true });
                  }}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                  <MessageSquare className="h-16 w-16 text-stone-300 mb-4" />
                  <h3 className="text-xl font-medium text-stone-700 mb-2">No conversation selected</h3>
                  <p className="text-stone-500 max-w-md mb-6">
                    Select a conversation from the list to view messages.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessagesPage;