/**
 * ConversationView Component
 * Displays direct message conversation between users
 */
import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  User, 
  Clock, 
  Loader, 
  ChevronLeft,
  MoreVertical,
  Archive,
  Trash,
  Flag,
  MessageCircle
} from 'lucide-react';
import { useAuth } from '../firebase/hooks/useAuth';
import { useMessages } from '../firebase/hooks/useMessages';

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
  
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  
  const messagesEndRef = useRef(null);
  const messageInputRef = useRef(null);
  
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
      // Firebase Timestamp
      date = new Date(timestamp.seconds * 1000);
    } else if (timestamp.toDate) {
      // Firebase Timestamp with toDate method
      date = timestamp.toDate();
    } else {
      // Regular Date object or timestamp
      date = new Date(timestamp);
    }
    
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    
    // If today, show time only
    if (date >= todayStart) {
      return `Today at ${date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
    }
    
    // If yesterday, show "Yesterday"
    if (date >= yesterdayStart) {
      return `Yesterday at ${date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
    }
    
    // If within the last 7 days, show day of week
    const lastWeekStart = new Date(todayStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 6);
    if (date >= lastWeekStart) {
      return `${date.toLocaleDateString([], { weekday: 'long' })} at ${date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
    }
    
    // If older, show full date
    return date.toLocaleDateString([], { 
      month: 'short', 
      day: 'numeric', 
      year: now.getFullYear() !== date.getFullYear() ? 'numeric' : undefined 
    });
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
    
    // Create a date string without time
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
        <Loader className="h-8 w-8 text-benchlot-primary animate-spin mb-4" />
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
              <div className="h-10 w-10 rounded-full bg-benchlot-accent-light flex items-center justify-center mr-3">
                <User className="h-6 w-6 text-benchlot-primary" />
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
              <MessageCircle className="h-6 w-6 text-benchlot-primary mr-3" />
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
                          ? 'bg-benchlot-primary text-white rounded-br-none' 
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
      
      {/* Message input */}
      <div className="border-t p-4">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <input
            type="text"
            ref={messageInputRef}
            className="flex-1 focus:ring-benchlot-primary focus:border-benchlot-primary block w-full px-4 py-2.5 text-sm border-stone-300 rounded-lg shadow-sm"
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            disabled={sendingMessage}
          />
          <button
            type="submit"
            className="inline-flex items-center px-4 py-2.5 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-benchlot-primary hover:bg-benchlot-secondary transition-colors disabled:opacity-50"
            disabled={!newMessage.trim() || sendingMessage}
          >
            {sendingMessage ? (
              <Loader className="h-4 w-4 animate-spin" />
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