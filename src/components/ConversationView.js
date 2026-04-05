/**
 * ConversationView Component
 * Displays direct message conversation between users.
 * Supports the Messages ↔ Offers bridge: listing context banner,
 * inline offer activity cards, and "Include Offer" composer action.
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  User,
  Loader,
  ChevronLeft,
  MoreVertical,
  Archive,
  MessageCircle,
  DollarSign,
  ExternalLink,
  X
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../firebase/hooks/useAuth';
import { useMessages } from '../firebase/hooks/useMessages';
import { useOffers } from '../firebase/hooks/useOffers';
import OfferActivityCard from './OfferActivityCard';

const ConversationView = ({ conversationId, onClose }) => {
  const { user } = useAuth();
  const {
    activeConversation,
    messages,
    loading,
    error,
    sendMessage,
    markAsRead,
    archiveConversation,
    MessageType
  } = useMessages(conversationId);

  const {
    createOfferFromConversation,
    getOffersForConversation
  } = useOffers();

  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  // Offer form state
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [offerAmount, setOfferAmount] = useState('');
  const [offerError, setOfferError] = useState('');
  const [submittingOffer, setSubmittingOffer] = useState(false);
  const [activeOfferOnTool, setActiveOfferOnTool] = useState(null);

  // Tool data for listing banner
  const [toolData, setToolData] = useState(null);

  const messagesEndRef = useRef(null);
  const messageInputRef = useRef(null);

  const hasToolContext = !!activeConversation?.metadata?.toolId;

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-focus the input field
  useEffect(() => {
    if (!loading) {
      messageInputRef.current?.focus();
    }
  }, [loading]);

  // Mark as read when viewed
  useEffect(() => {
    if (conversationId && user?.uid) {
      markAsRead(conversationId);
    }
  }, [conversationId, user?.uid, markAsRead]);

  // Load tool data for listing context banner
  useEffect(() => {
    if (!activeConversation?.metadata?.toolId) {
      setToolData(null);
      return;
    }

    const loadTool = async () => {
      try {
        const { getToolById } = await import('../firebase/models/toolModel');
        const tool = await getToolById(activeConversation.metadata.toolId);
        setToolData(tool);
      } catch (err) {
        // Fall back to metadata if tool fetch fails (e.g., tool deleted)
        setToolData({
          id: activeConversation.metadata.toolId,
          name: activeConversation.metadata.toolName || activeConversation.metadata.topic?.replace('About: ', ''),
          images: activeConversation.metadata.toolImage ? [{ url: activeConversation.metadata.toolImage }] : [],
          price: activeConversation.metadata.toolPrice || null
        });
      }
    };

    loadTool();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConversation?.metadata?.toolId]);

  // Check for existing active offers on this tool in this conversation
  useEffect(() => {
    if (!conversationId || !hasToolContext) {
      setActiveOfferOnTool(null);
      return;
    }

    const checkOffers = async () => {
      try {
        const offers = await getOffersForConversation(conversationId);
        const active = offers.find(o => o.isActive);
        setActiveOfferOnTool(active || null);
      } catch {
        setActiveOfferOnTool(null);
      }
    };

    checkOffers();
  }, [conversationId, hasToolContext, getOffersForConversation, messages]);

  // Handle sending a new message
  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (!newMessage.trim() || !conversationId) return;

    try {
      setSendingMessage(true);
      await sendMessage(newMessage.trim(), conversationId);
      setNewMessage('');
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setSendingMessage(false);
      messageInputRef.current?.focus();
    }
  };

  // Handle submitting an offer from the composer
  const handleSubmitOffer = async (e) => {
    e.preventDefault();

    const amount = parseFloat(offerAmount);
    const askingPrice = toolData?.price || toolData?.current_price;

    if (isNaN(amount) || amount <= 0) {
      setOfferError('Please enter a valid offer amount.');
      return;
    }

    if (askingPrice) {
      if (amount >= askingPrice) {
        setOfferError('Your offer should be lower than the asking price.');
        return;
      }
      if (amount < askingPrice * 0.5) {
        setOfferError('Please offer at least 50% of the asking price.');
        return;
      }
    }

    try {
      setSubmittingOffer(true);
      setOfferError('');

      await createOfferFromConversation(
        conversationId,
        amount,
        newMessage.trim(),
        activeConversation
      );

      // Reset form
      setShowOfferForm(false);
      setOfferAmount('');
      setNewMessage('');
    } catch (err) {
      console.error('Error creating offer from conversation:', err);
      setOfferError(err.message || 'Failed to submit offer.');
    } finally {
      setSubmittingOffer(false);
    }
  };

  // Handle archive conversation
  const handleArchive = async () => {
    if (!conversationId) return;

    try {
      await archiveConversation(conversationId);
      setShowMenu(false);
      if (onClose) onClose();
    } catch (err) {
      console.error('Error archiving conversation:', err);
    }
  };

  // Format date for display
  const formatDate = (timestamp) => {
    if (!timestamp) return '';

    let date;
    if (timestamp.seconds) {
      date = new Date(timestamp.seconds * 1000);
    } else if (timestamp.toDate) {
      date = timestamp.toDate();
    } else {
      date = new Date(timestamp);
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);

    if (date >= todayStart) {
      return `Today at ${date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
    }

    if (date >= yesterdayStart) {
      return `Yesterday at ${date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
    }

    const lastWeekStart = new Date(todayStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 6);
    if (date >= lastWeekStart) {
      return `${date.toLocaleDateString([], { weekday: 'long' })} at ${date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
    }

    return date.toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      year: now.getFullYear() !== date.getFullYear() ? 'numeric' : undefined
    });
  };

  const formatPrice = (price) => {
    if (!price && price !== 0) return '';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(price);
  };

  // Find the other participant in the conversation
  const getOtherParticipant = () => {
    if (!activeConversation || !user) return null;

    const otherUserId = activeConversation.participants.find(id => id !== user.uid);
    const username = activeConversation.participantNames?.[otherUserId] || "User";

    return {
      id: otherUserId,
      name: username
    };
  };

  const otherParticipant = getOtherParticipant();

  // Group messages by date
  const groupedMessages = messages.reduce((groups, message) => {
    if (!message.createdAt) return groups;

    let date;
    if (message.createdAt.seconds) {
      date = new Date(message.createdAt.seconds * 1000);
    } else if (message.createdAt.toDate) {
      date = message.createdAt.toDate();
    } else {
      date = new Date(message.createdAt);
    }

    const dateStr = date.toLocaleDateString();

    if (!groups[dateStr]) {
      groups[dateStr] = [];
    }

    groups[dateStr].push(message);
    return groups;
  }, {});

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <Loader className="h-8 w-8 text-spruce animate-spin mb-4" />
        <p className="text-stone-600">Loading conversation...</p>
      </div>
    );
  }

  // Error state
  if (error || !activeConversation) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="bg-red-50 text-red-700 p-4 rounded-lg max-w-md text-center">
          <p className="font-medium mb-2">Unable to load conversation</p>
          <p className="text-sm">{error || 'Conversation not found'}</p>
          <button
            onClick={onClose}
            className="mt-4 px-4 py-2 bg-stone-100 hover:bg-stone-200 rounded-md text-stone-700"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center">
          {otherParticipant ? (
            <>
              <div className="h-10 w-10 rounded-full bg-bone-dark flex items-center justify-center mr-3">
                <User className="h-6 w-6 text-spruce" />
              </div>
              <div>
                <h3 className="font-medium">{otherParticipant.name}</h3>
                <p className="text-sm text-stone-500">
                  {activeConversation.metadata?.topic || 'Direct message'}
                </p>
              </div>
            </>
          ) : (
            <div className="flex items-center">
              <MessageCircle className="h-6 w-6 text-spruce mr-3" />
              <h3 className="font-medium">Conversation</h3>
            </div>
          )}
        </div>

        {/* Action menu */}
        <div className="relative">
          <button
            className="p-2 rounded-full hover:bg-stone-100 transition-colors"
            onClick={() => setShowMenu(!showMenu)}
          >
            <MoreVertical className="h-5 w-5 text-stone-600" />
          </button>

          {showMenu && (
            <div className="absolute right-0 w-48 mt-2 bg-white rounded-md shadow-lg z-10 border border-stone-200 py-1">
              <button
                className="w-full text-left px-4 py-2 hover:bg-stone-100 text-stone-800 flex items-center"
                onClick={handleArchive}
              >
                <Archive className="h-4 w-4 mr-2 text-stone-500" />
                Archive conversation
              </button>
              <button
                className="w-full text-left px-4 py-2 hover:bg-stone-100 text-stone-800 flex items-center"
                onClick={() => {
                  setShowMenu(false);
                  if (onClose) onClose();
                }}
              >
                <ChevronLeft className="h-4 w-4 mr-2 text-stone-500" />
                Back to messages
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Listing Context Banner — pinned at top when conversation is about a tool */}
      {hasToolContext && toolData && (
        <div className="border-b bg-bone-dark px-4 py-3">
          <Link
            to={`/tools/${toolData.id}`}
            className="flex items-center gap-3 group"
          >
            <div className="w-14 h-14 bg-stone-200 rounded overflow-hidden flex-shrink-0">
              {toolData.images?.[0]?.url ? (
                <img
                  src={toolData.images[0].url}
                  alt={toolData.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-stone-400 text-xs">
                  No img
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center">
                <h4 className="font-medium text-stone-800 truncate group-hover:text-spruce transition-colors">
                  {toolData.name || toolData.title}
                </h4>
                <ExternalLink className="h-3 w-3 ml-1 text-stone-400 flex-shrink-0" />
              </div>
              {(toolData.price || toolData.current_price) && (
                <p className="text-sm text-honey font-medium">
                  {formatPrice(toolData.current_price || toolData.price)}
                </p>
              )}
              {toolData.condition && (
                <p className="text-xs text-stone-500">Condition: {toolData.condition}</p>
              )}
            </div>
          </Link>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {Object.entries(groupedMessages).map(([dateStr, dayMessages]) => (
          <div key={dateStr} className="space-y-4">
            {/* Date divider */}
            <div className="flex items-center justify-center">
              <div className="bg-stone-100 text-stone-600 text-xs font-medium px-3 py-1 rounded-full">
                {formatDate(dayMessages[0].createdAt)}
              </div>
            </div>

            {/* Messages for this day */}
            {dayMessages.map((message, index) => {
              const isCurrentUser = message.senderId === user?.uid;
              const isSystem = message.type === MessageType.SYSTEM;
              const isOfferActivity = message.type === MessageType.OFFER_ACTIVITY || message.type === 'offer_activity';

              // Render offer activity card
              if (isOfferActivity) {
                return (
                  <OfferActivityCard
                    key={message.id || index}
                    message={message}
                  />
                );
              }

              // Skip rendering a bubble if it's going to be empty
              if (!message.text && !isSystem) return null;

              return isSystem ? (
                // System message
                <div key={message.id || index} className="flex justify-center">
                  <div className="bg-stone-100 text-stone-600 text-xs px-3 py-1.5 rounded-full">
                    {message.text}
                  </div>
                </div>
              ) : (
                // User message
                <div
                  key={message.id || index}
                  className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div className="max-w-[85%] sm:max-w-[70%]">
                    {!isCurrentUser && (
                      <div className="flex items-center mb-1 ml-2">
                        <span className="text-xs font-medium text-stone-600">
                          {otherParticipant?.name || 'User'}
                        </span>
                        <span className="text-xs text-stone-400 ml-2">
                          {message.createdAt ? new Date(message.createdAt.seconds * 1000).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : ''}
                        </span>
                      </div>
                    )}
                    <div
                      className={`p-3 rounded-lg ${
                        isCurrentUser
                          ? 'bg-spruce text-bone rounded-br-none'
                          : 'bg-stone-100 text-stone-800 rounded-bl-none'
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words">{message.text}</p>
                    </div>
                    {isCurrentUser && (
                      <div className="flex items-center justify-end mt-1 mr-2">
                        <span className="text-xs text-stone-400">
                          {message.createdAt ? new Date(message.createdAt.seconds * 1000).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : ''}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}

        {/* Empty state */}
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <MessageCircle className="h-12 w-12 text-stone-300 mb-3" />
            <h3 className="text-lg font-medium text-stone-700 mb-1">No messages yet</h3>
            <p className="text-stone-500 text-sm max-w-xs mb-4">
              Start a conversation by sending a message below.
            </p>
            {error && (
              <div className="bg-amber-50 text-amber-700 p-3 rounded-md text-sm">
                <p>Unable to load messages. This may be because the conversation is new or permissions haven't been set up yet.</p>
                <p className="mt-2">Try sending a message to initialize the conversation.</p>
              </div>
            )}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Include Offer form — expands above the composer */}
      {showOfferForm && hasToolContext && (
        <div className="border-t bg-bone-light p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-stone-800">Include an Offer</h4>
            <button
              onClick={() => { setShowOfferForm(false); setOfferError(''); }}
              className="text-stone-400 hover:text-stone-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {activeOfferOnTool ? (
            <div className="text-sm text-stone-600 bg-amber-50 border border-amber-200 rounded-md p-3">
              <p>You already have an active offer on this item: <span className="font-medium text-spruce">{formatPrice(activeOfferOnTool.currentPrice)}</span> ({activeOfferOnTool.status})</p>
            </div>
          ) : (
            <form onSubmit={handleSubmitOffer}>
              {toolData && (toolData.price || toolData.current_price) && (
                <p className="text-xs text-stone-500 mb-2">
                  Asking price: <span className="font-medium">{formatPrice(toolData.current_price || toolData.price)}</span>
                </p>
              )}
              <div className="relative mb-2">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <DollarSign className="h-4 w-4 text-stone-500" />
                </div>
                <input
                  type="text"
                  className="w-full pl-8 pr-3 py-2 text-sm border border-stone-300 rounded-md focus:ring-spruce focus:border-spruce"
                  placeholder="Your offer amount"
                  value={offerAmount}
                  onChange={(e) => setOfferAmount(e.target.value.replace(/[^\d.]/g, ''))}
                  autoFocus
                />
              </div>
              {offerError && (
                <p className="text-xs text-red-600 mb-2">{offerError}</p>
              )}
              <p className="text-xs text-stone-500 mb-2">
                Add a message below, then click "Send Offer"
              </p>
            </form>
          )}
        </div>
      )}

      {/* Message input / composer */}
      <div className="border-t p-4">
        {/* Include Offer toggle — only visible for tool-linked conversations */}
        {hasToolContext && !showOfferForm && (
          <div className="mb-2">
            <button
              onClick={() => {
                setShowOfferForm(true);
                setOfferError('');
                const askingPrice = toolData?.current_price || toolData?.price;
                if (askingPrice) {
                  setOfferAmount(Math.floor(askingPrice * 0.9).toString());
                }
              }}
              className="inline-flex items-center text-xs text-spruce hover:text-spruce-light font-medium transition-colors"
            >
              <DollarSign className="h-3.5 w-3.5 mr-1" />
              Include an Offer
            </button>
          </div>
        )}

        <form onSubmit={showOfferForm && !activeOfferOnTool ? handleSubmitOffer : handleSendMessage} className="flex gap-2">
          <input
            type="text"
            ref={messageInputRef}
            className="flex-1 focus:ring-spruce focus:border-spruce block w-full px-4 py-2.5 text-sm border-stone-300 rounded-lg shadow-sm"
            placeholder={showOfferForm ? "Message to include with your offer..." : "Type a message..."}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            disabled={sendingMessage || submittingOffer}
          />
          <button
            type="submit"
            className="inline-flex items-center px-4 py-2.5 border border-transparent rounded-lg shadow-sm text-sm font-medium text-bone bg-spruce hover:bg-spruce-light transition-colors disabled:opacity-50"
            disabled={
              (showOfferForm && !activeOfferOnTool)
                ? (!offerAmount || submittingOffer)
                : (!newMessage.trim() || sendingMessage)
            }
          >
            {sendingMessage || submittingOffer ? (
              <Loader className="h-4 w-4 animate-spin" />
            ) : showOfferForm && !activeOfferOnTool ? (
              <span className="flex items-center">
                <DollarSign className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Send Offer</span>
              </span>
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ConversationView;
