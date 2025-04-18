/**
 * useMessages Hook
 * Provides direct messaging functionality between users
 */
import { useState, useEffect, useCallback } from 'react';
import { onSnapshot, collection, query, where, orderBy, doc } from 'firebase/firestore';
import { db } from '../config';
import { useAuth } from './useAuth';
import messageModel, { MessageType, ConversationStatus } from '../models/messageModel';

const useMessages = (conversationId = null) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  
  // Listen for all user conversations
  useEffect(() => {
    if (!user?.uid) {
      setConversations([]);
      setUnreadCount(0);
      return () => {};
    }
    
    setLoading(true);
    
    try {
      // Query for all conversations where user is a participant
      const conversationsQuery = query(
        collection(db, 'conversations'),
        where('participants', 'array-contains', user.uid),
        orderBy('lastMessageAt', 'desc')
      );
      
      const unsubscribe = onSnapshot(conversationsQuery, (snapshot) => {
        const conversationList = [];
        let unread = 0;
        
        snapshot.forEach(doc => {
          const data = doc.data();
          const conversation = {
            id: doc.id,
            ...data
          };
          
          // Check if this conversation has unread messages for this user
          if (data.unreadByUsers && data.unreadByUsers.includes(user.uid)) {
            unread++;
            conversation.hasUnread = true;
          } else {
            conversation.hasUnread = false;
          }
          
          conversationList.push(conversation);
        });
        
        setConversations(conversationList);
        setUnreadCount(unread);
        setLoading(false);
      }, (err) => {
        console.error('Error in conversations listener:', err);
        
        // If we get a permission error, it's likely because the collection doesn't exist yet
        // or the proper indexes aren't created - this is fine for new users
        if (err.code === 'permission-denied' || err.code === 'failed-precondition') {
          // Return empty data instead of showing an error, since this is expected for new users
          setConversations([]);
          setUnreadCount(0);
          setError(null);
        } else {
          setError('Failed to load conversations');
        }
        
        setLoading(false);
      });
      
      return () => unsubscribe();
    } catch (err) {
      console.error('Error setting up conversations listener:', err);
      
      // If we get a permission error, it's likely because the collection doesn't exist yet
      if (err.code === 'permission-denied' || err.code === 'failed-precondition') {
        // Return empty data instead of showing an error
        setConversations([]);
        setUnreadCount(0);
        setError(null);
      } else {
        setError('Failed to load conversations');
      }
      
      setLoading(false);
      return () => {};
    }
  }, [user?.uid]);
  
  // Listen for messages in the active conversation
  useEffect(() => {
    if (!conversationId || !user?.uid) {
      setMessages([]);
      setActiveConversation(null);
      return () => {};
    }
    
    setLoading(true);
    
    try {
      // First, get the conversation details
      const conversationRef = doc(db, 'conversations', conversationId);
      const conversationUnsubscribe = onSnapshot(conversationRef, (doc) => {
        if (doc.exists()) {
          setActiveConversation({
            id: doc.id,
            ...doc.data()
          });
          
          // Mark as read when viewing
          messageModel.markConversationAsRead(conversationId, user.uid)
            .catch(err => console.error('Error marking conversation as read:', err));
        } else {
          setActiveConversation(null);
          setError('Conversation not found');
        }
      }, (err) => {
        console.error('Error in conversation listener:', err);
        
        // If we get a permission error, it's likely because the collection doesn't exist yet
        if (err.code === 'permission-denied' || err.code === 'failed-precondition') {
          // Return empty data instead of showing an error
          setActiveConversation(null);
          setError(null);
        } else {
          setError('Failed to load conversation');
        }
      });
      
      // Then, listen for messages in this conversation
      const messagesQuery = query(
        collection(db, 'conversations', conversationId, 'messages'),
        orderBy('createdAt')
      );
      
      const messagesUnsubscribe = onSnapshot(messagesQuery, (snapshot) => {
        const messageList = [];
        
        snapshot.forEach(doc => {
          messageList.push({
            id: doc.id,
            ...doc.data()
          });
        });
        
        setMessages(messageList);
        setLoading(false);
      }, (err) => {
        console.error('Error in messages listener:', err);
        
        // If we get a permission error, it's likely because the collection doesn't exist yet
        if (err.code === 'permission-denied' || err.code === 'failed-precondition') {
          // Return empty data instead of showing an error
          setMessages([]);
          setError(null);
        } else {
          setError('Failed to load messages');
        }
        
        setLoading(false);
      });
      
      return () => {
        conversationUnsubscribe();
        messagesUnsubscribe();
      };
    } catch (err) {
      console.error('Error setting up messages listener:', err);
      
      // If we get a permission error, it's likely because the collection doesn't exist yet
      if (err.code === 'permission-denied' || err.code === 'failed-precondition') {
        // Return empty data instead of showing an error
        setMessages([]);
        setActiveConversation(null);
        setError(null);
      } else {
        setError('Failed to load messages');
      }
      
      setLoading(false);
      return () => {};
    }
  }, [conversationId, user?.uid]);
  
  // Create a new conversation
  const startConversation = useCallback(async (recipientId, metadata = {}) => {
    if (!user?.uid) throw new Error('You must be logged in to start a conversation');
    
    try {
      const conversation = await messageModel.getOrCreateConversation(user.uid, recipientId, metadata);
      return conversation;
    } catch (err) {
      console.error('Error starting conversation:', err);
      throw err;
    }
  }, [user]);
  
  // Find an existing conversation with a user
  const findConversation = useCallback(async (otherUserId) => {
    if (!user?.uid) throw new Error('You must be logged in to find a conversation');
    
    try {
      return await messageModel.findConversationBetweenUsers(user.uid, otherUserId);
    } catch (err) {
      console.error('Error finding conversation:', err);
      throw err;
    }
  }, [user]);
  
  // Send a message in a conversation
  const sendMessage = useCallback(async (text, conversationId) => {
    if (!user?.uid) throw new Error('You must be logged in to send messages');
    
    try {
      const message = await messageModel.sendMessage(conversationId, {
        senderId: user.uid,
        text,
        type: MessageType.TEXT
      });
      
      return message;
    } catch (err) {
      console.error('Error sending message:', err);
      throw err;
    }
  }, [user]);
  
  // Send a system message
  const sendSystemMessage = useCallback(async (text, conversationId) => {
    if (!user?.uid) throw new Error('You must be logged in to send messages');
    
    try {
      const message = await messageModel.sendMessage(conversationId, {
        senderId: user.uid,
        text,
        type: MessageType.SYSTEM
      });
      
      return message;
    } catch (err) {
      console.error('Error sending system message:', err);
      throw err;
    }
  }, [user]);
  
  // Mark a conversation as read
  const markAsRead = useCallback(async (conversationId) => {
    if (!user?.uid) return;
    
    try {
      await messageModel.markConversationAsRead(conversationId, user.uid);
    } catch (err) {
      console.error('Error marking conversation as read:', err);
    }
  }, [user]);
  
  // Archive a conversation
  const archiveConversation = useCallback(async (conversationId) => {
    if (!user?.uid) throw new Error('You must be logged in to archive a conversation');
    
    try {
      await messageModel.archiveConversation(conversationId, user.uid);
    } catch (err) {
      console.error('Error archiving conversation:', err);
      throw err;
    }
  }, [user]);
  
  return {
    loading,
    error,
    conversations,
    activeConversation,
    messages,
    unreadCount,
    startConversation,
    findConversation,
    sendMessage,
    sendSystemMessage,
    markAsRead,
    archiveConversation,
    hasUnreadMessages: unreadCount > 0,
    MessageType,
    ConversationStatus
  };
};

export { useMessages };