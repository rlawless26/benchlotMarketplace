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
import { openAuthModal } from '../utils/featureFlags';

import { useAuth } from '../firebase/hooks/useAuth';
import { useOffers } from '../firebase/hooks/useOffers';
import { useMessages } from '../firebase/hooks/useMessages';
import OfferConversation from '../components/OfferConversation';
import ConversationView from '../components/ConversationView';

const MessagesPage = () => {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const { 
    activeOffers, 
    loading: offersLoading,
    error: offersError,
    OfferStatus
  } = useOffers();
  
  const params = useParams();
  const conversationId = params?.conversationId;
  
  const navigate = useNavigate();
  
  const [filterType, setFilterType] = useState('all'); // 'all', 'unread', 'read'
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredMessages, setFilteredMessages] = useState([]);
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
  const isLoading = authLoading || (offersLoading && messagesLoading && !filteredMessages.length && !conversations.length);
  
  // Check if user is authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated()) {
      openAuthModal('signin', '/messages');
    }
  }, [authLoading, isAuthenticated]);
  
  // Set conversation ID from URL params
  useEffect(() => {
    if (conversationId) {
      setSelectedConversationId(conversationId);
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
  
  // Combine offers and direct messages into a single list and apply filters
  useEffect(() => {
    // First, prepare offer items
    let offerItems = activeOffers.map(offer => {
      const isBuyer = user?.uid === offer.buyerId;
      const hasUnreadMessages = isBuyer 
        ? offer.hasUnreadMessagesBuyer 
        : offer.hasUnreadMessagesSeller;
      
      return {
        id: offer.id,
        type: 'offer',
        title: offer.toolTitle,
        price: offer.currentPrice,
        originalPrice: offer.originalPrice,
        status: offer.status,
        timestamp: offer.updatedAt,
        hasUnread: hasUnreadMessages,
        data: offer,
        otherPartyName: isBuyer ? (offer.sellerName || 'Seller') : (offer.buyerName || 'Buyer'),
        isBuyer: isBuyer,
        previewText: `${isBuyer ? 'Your' : 'Their'} offer: ${formatPrice(offer.currentPrice)}`
      };
    });
    
    // Then, prepare conversation items
    let conversationItems = conversations.map(convo => {
      const otherParticipant = convo.participants.find(id => id !== user?.uid);
      
      return {
        id: convo.id,
        type: 'conversation',
        title: convo.participantNames?.[otherParticipant] || "User",
        timestamp: convo.lastMessageAt?.toDate?.() || convo.lastMessageAt,
        hasUnread: convo.hasUnread,
        data: convo,
        otherPartyName: convo.participantNames?.[otherParticipant] || "User",
        previewText: convo.lastMessageText || "No messages yet"
      };
    });
    
    // Combine both lists
    let combined = [...offerItems, ...conversationItems];
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      combined = combined.filter(item => 
        item.title?.toLowerCase().includes(query) || 
        item.otherPartyName?.toLowerCase().includes(query) ||
        item.previewText?.toLowerCase().includes(query)
      );
    }
    
    // Apply read/unread filter
    if (filterType === 'unread') {
      combined = combined.filter(item => item.hasUnread);
    } else if (filterType === 'read') {
      combined = combined.filter(item => !item.hasUnread);
    }
    
    // Sort by most recent first
    combined.sort((a, b) => {
      const timeA = a.timestamp?.seconds ? a.timestamp.seconds * 1000 : (a.timestamp?.getTime ? a.timestamp.getTime() : 0);
      const timeB = b.timestamp?.seconds ? b.timestamp.seconds * 1000 : (b.timestamp?.getTime ? b.timestamp.getTime() : 0);
      return timeB - timeA; // Descending order (newest first)
    });
    
    setFilteredMessages(combined);
    
    // If selected offer is not in filtered list, deselect it
    if (selectedOfferId && !offerItems.some(o => o.id === selectedOfferId)) {
      setSelectedOfferId(null);
      setSelectedOffer(null);
    }
    
    // If selected conversation is not in filtered list, deselect it
    if (selectedConversationId && !conversationItems.some(c => c.id === selectedConversationId)) {
      setSelectedConversationId(null);
    }
  }, [activeOffers, conversations, searchQuery, filterType, selectedOfferId, selectedConversationId, user?.uid]);
  
  // Update selected offer when ID changes
  useEffect(() => {
    if (selectedOfferId) {
      const offerItem = filteredMessages.find(item => item.type === 'offer' && item.id === selectedOfferId);
      setSelectedOffer(offerItem?.data || null);
      
      if (isMobile) {
        setShowConversation(true);
      }
    } else {
      setSelectedOffer(null);
      
      if (isMobile && !selectedConversationId) {
        setShowConversation(false);
      }
    }
  }, [selectedOfferId, filteredMessages, isMobile, selectedConversationId]);
  
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
  
  // Handle selecting any message item (offer or conversation)
  const handleSelectMessage = (item) => {
    if (item.type === 'conversation') {
      setSelectedConversationId(item.id);
      setSelectedOfferId(null);
      setSelectedOffer(null);
      
      if (isMobile) {
        setShowConversation(true);
      }
      
      // Update URL without reloading
      navigate(`/messages/conversation/${item.id}`, { replace: true });
      
      // Mark as read when selected
      if (item.hasUnread) {
        markAsRead(item.id);
      }
    } else if (item.type === 'offer') {
      setSelectedOfferId(item.id);
      setSelectedConversationId(null);
      setSelectedOffer(item.data);
      
      if (isMobile) {
        setShowConversation(true);
      }
      
      // Update URL without reloading
      navigate('/messages', { replace: true });
    }
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
        
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="grid md:grid-cols-3 h-[600px]">
            {/* Left sidebar with unified message list */}
            <div className="md:col-span-1 border-r">
              {/* Filter and search bar */}
              <div className="border-b">
                <div className="flex border-b">
                  <button
                    className={`flex-1 py-3 px-4 text-center font-medium text-sm ${
                      filterType === 'all' ? 'text-benchlot-primary border-b-2 border-benchlot-primary' : 'text-stone-600 hover:text-stone-900'
                    }`}
                    onClick={() => setFilterType('all')}
                  >
                    All
                  </button>
                  <button
                    className={`flex-1 py-3 px-4 text-center font-medium text-sm ${
                      filterType === 'unread' ? 'text-benchlot-primary border-b-2 border-benchlot-primary' : 'text-stone-600 hover:text-stone-900'
                    }`}
                    onClick={() => setFilterType('unread')}
                  >
                    Unread
                  </button>
                </div>
                <div className="p-3">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search messages..."
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
              
              {/* Unified Message list */}
              <div className="overflow-y-auto h-[calc(600px-106px)]">
                {/* Error states */}
                {(offersError || messagesError) && (
                  <div className="p-4 text-red-800 bg-red-50">
                    {offersError || messagesError}
                  </div>
                )}
                
                {/* Empty state */}
                {filteredMessages.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                    <MessageSquare className="h-12 w-12 text-stone-300 mb-3" />
                    <h3 className="text-lg font-medium text-stone-700 mb-1">No messages found</h3>
                    <p className="text-stone-500 text-sm max-w-xs">
                      {searchQuery 
                        ? 'No messages match your search. Try different keywords.' 
                        : filterType === 'unread'
                          ? 'You don\'t have any unread messages.'
                          : 'You don\'t have any messages yet.'
                      }
                    </p>
                    <div className="mt-6">
                      <Link to="/marketplace" className="px-4 py-2 bg-benchlot-primary text-white rounded-md">
                        Browse Marketplace
                      </Link>
                    </div>
                  </div>
                )}
                
                {/* Unified message list */}
                {filteredMessages.length > 0 && (
                  <ul className="divide-y divide-stone-200">
                    {filteredMessages.map((item) => {
                      const isOffer = item.type === 'offer';
                      const isSelected = isOffer 
                        ? selectedOfferId === item.id
                        : selectedConversationId === item.id;
                        
                      return (
                        <li 
                          key={item.id}
                          className={`hover:bg-stone-50 cursor-pointer ${
                            isSelected ? 'bg-benchlot-accent-light' : ''
                          } ${item.hasUnread ? 'border-l-4 border-benchlot-primary' : 'border-l-4 border-transparent'}`}
                          onClick={() => handleSelectMessage(item)}
                        >
                          <div className="p-4">
                            <div className="flex justify-between items-start mb-1">
                              <div className="flex items-center">
                                {isOffer ? (
                                  item.isBuyer ? (
                                    <ShoppingBag className="h-5 w-5 text-benchlot-primary mr-2" />
                                  ) : (
                                    <Package className="h-5 w-5 text-benchlot-accent-dark mr-2" />
                                  )
                                ) : (
                                  <User className="h-5 w-5 text-benchlot-primary mr-2" />
                                )}
                                <div>
                                  <span className="font-medium truncate max-w-[140px] flex items-center">
                                    {item.title}
                                    {isOffer && (
                                      <span className="ml-2 text-xs px-1.5 py-0.5 rounded-sm font-normal bg-amber-100 text-amber-800">
                                        Offer
                                      </span>
                                    )}
                                  </span>
                                </div>
                              </div>
                              <span className="text-xs text-stone-500">
                                {formatDate(item.timestamp)}
                              </span>
                            </div>
                            
                            <div className="text-sm text-stone-600 line-clamp-1 mb-1">
                              {/* With who or what */}
                              <span className="mr-1 text-xs text-stone-500">
                                {isOffer 
                                  ? (item.isBuyer ? 'To: ' : 'From: ') 
                                  : ''}
                              </span>
                              {item.otherPartyName}
                              {isOffer && (
                                <span className="inline-block ml-2">
                                  {getStatusBadge(item.status)}
                                </span>
                              )}
                            </div>
                            
                            <div className="text-sm text-stone-600 line-clamp-1">
                              {item.previewText}
                            </div>
                            
                            {item.hasUnread && (
                              <div className="mt-2 flex justify-end">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-benchlot-primary text-white">
                                  <Bell className="h-3 w-3 mr-1" />
                                  {isOffer ? 'New message' : 'Unread'}
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