/**
 * Message Model
 * Handles direct messages between users
 */
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs,
  getDoc,
  addDoc, 
  updateDoc, 
  serverTimestamp,
  doc,
  or,
  and
} from 'firebase/firestore';
import { db } from '../config';

// Collection references
const messagesCollection = collection(db, 'messages');
const conversationsCollection = collection(db, 'conversations');

// Message and conversation types
export const MessageType = {
  TEXT: 'text',
  SYSTEM: 'system'
};

export const ConversationStatus = {
  ACTIVE: 'active',
  ARCHIVED: 'archived',
  HIDDEN: 'hidden'
};

/**
 * Get or create a conversation between two users
 * @param {string} senderId - The sender's user ID
 * @param {string} recipientId - The recipient's user ID
 * @param {Object} metadata - Optional conversation metadata
 * @returns {Promise<Object>} - The conversation object
 */
export const getOrCreateConversation = async (senderId, recipientId, metadata = {}) => {
  if (!senderId || !recipientId) {
    throw new Error('Both sender and recipient IDs are required');
  }
  
  try {
    // Check if conversation already exists
    const existingConversation = await findConversationBetweenUsers(senderId, recipientId);
    
    if (existingConversation) {
      return existingConversation;
    }
    
    // Create new conversation
    const conversationData = {
      participants: [senderId, recipientId],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastMessageAt: serverTimestamp(),
      lastMessageText: '',
      unreadByUsers: [],
      status: ConversationStatus.ACTIVE,
      ...metadata
    };
    
    const conversationRef = await addDoc(conversationsCollection, conversationData);
    
    return {
      id: conversationRef.id,
      ...conversationData
    };
  } catch (error) {
    console.error('Error getting or creating conversation:', error);
    throw error;
  }
};

/**
 * Find a conversation between two users
 * @param {string} user1Id - First user ID
 * @param {string} user2Id - Second user ID
 * @returns {Promise<Object|null>} - The conversation object or null if not found
 */
export const findConversationBetweenUsers = async (user1Id, user2Id) => {
  try {
    const q = query(
      conversationsCollection,
      where('participants', 'array-contains', user1Id)
    );
    
    const querySnapshot = await getDocs(q);
    
    let conversation = null;
    
    querySnapshot.forEach(doc => {
      const data = doc.data();
      if (data.participants.includes(user2Id)) {
        conversation = {
          id: doc.id,
          ...data
        };
      }
    });
    
    return conversation;
  } catch (error) {
    console.error('Error finding conversation:', error);
    throw error;
  }
};

/**
 * Get conversations for a user
 * @param {string} userId - The user ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>} - Array of conversation objects
 */
export const getUserConversations = async (userId, options = {}) => {
  try {
    const { status, limit: queryLimit = 20 } = options;
    
    let q = query(
      conversationsCollection,
      where('participants', 'array-contains', userId),
      orderBy('lastMessageAt', 'desc')
    );
    
    if (status) {
      q = query(q, where('status', '==', status));
    }
    
    if (queryLimit) {
      q = query(q, limit(queryLimit));
    }
    
    const querySnapshot = await getDocs(q);
    
    const conversations = [];
    querySnapshot.forEach(doc => {
      conversations.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return conversations;
  } catch (error) {
    console.error('Error getting user conversations:', error);
    throw error;
  }
};

/**
 * Get conversation by ID
 * @param {string} conversationId - The conversation ID
 * @returns {Promise<Object>} - The conversation object
 */
export const getConversationById = async (conversationId) => {
  try {
    const conversationRef = doc(conversationsCollection, conversationId);
    const conversationSnap = await getDoc(conversationRef);
    
    if (!conversationSnap.exists()) {
      throw new Error('Conversation not found');
    }
    
    return {
      id: conversationSnap.id,
      ...conversationSnap.data()
    };
  } catch (error) {
    console.error('Error getting conversation:', error);
    throw error;
  }
};

/**
 * Send a message in a conversation
 * @param {string} conversationId - The conversation ID
 * @param {Object} messageData - The message data
 * @returns {Promise<Object>} - The sent message object
 */
export const sendMessage = async (conversationId, messageData) => {
  try {
    const { senderId, text, type = MessageType.TEXT } = messageData;
    
    if (!senderId || !text || !conversationId) {
      throw new Error('Missing required fields for message');
    }
    
    // Get the conversation to update it
    const conversation = await getConversationById(conversationId);
    
    if (!conversation) {
      throw new Error('Conversation not found');
    }
    
    // Make sure sender is part of the conversation
    if (!conversation.participants.includes(senderId)) {
      throw new Error('User not authorized to send messages in this conversation');
    }
    
    // Add message to messages collection
    const messageRef = await addDoc(collection(db, 'conversations', conversationId, 'messages'), {
      senderId,
      text,
      type,
      createdAt: serverTimestamp()
    });
    
    // Update conversation document
    const conversationRef = doc(conversationsCollection, conversationId);
    
    // Mark as unread for all participants except sender
    const unreadByUsers = conversation.participants.filter(id => id !== senderId);
    
    await updateDoc(conversationRef, {
      lastMessageAt: serverTimestamp(),
      lastMessageText: text.substring(0, 100), // Truncate for preview
      unreadByUsers,
      updatedAt: serverTimestamp()
    });
    
    const messageSnap = await getDoc(messageRef);
    
    return {
      id: messageRef.id,
      conversationId,
      ...messageSnap.data()
    };
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
};

/**
 * Get messages for a conversation
 * @param {string} conversationId - The conversation ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>} - Array of message objects
 */
export const getConversationMessages = async (conversationId, options = {}) => {
  try {
    const { limit: queryLimit = 50 } = options;
    
    let q = query(
      collection(db, 'conversations', conversationId, 'messages'),
      orderBy('createdAt')
    );
    
    if (queryLimit) {
      q = query(q, limit(queryLimit));
    }
    
    const querySnapshot = await getDocs(q);
    
    const messages = [];
    querySnapshot.forEach(doc => {
      messages.push({
        id: doc.id,
        conversationId,
        ...doc.data()
      });
    });
    
    return messages;
  } catch (error) {
    console.error('Error getting conversation messages:', error);
    throw error;
  }
};

/**
 * Mark a conversation as read for a user
 * @param {string} conversationId - The conversation ID
 * @param {string} userId - The user ID
 * @returns {Promise<void>}
 */
export const markConversationAsRead = async (conversationId, userId) => {
  try {
    const conversationRef = doc(conversationsCollection, conversationId);
    const conversationSnap = await getDoc(conversationRef);
    
    if (!conversationSnap.exists()) {
      throw new Error('Conversation not found');
    }
    
    const conversationData = conversationSnap.data();
    
    // Update unreadByUsers array to remove the user
    const unreadByUsers = conversationData.unreadByUsers.filter(id => id !== userId);
    
    await updateDoc(conversationRef, {
      unreadByUsers
    });
    
    // Also mark all messages as read
    await markConversationMessagesAsRead(conversationId, userId);
  } catch (error) {
    console.error('Error marking conversation as read:', error);
    throw error;
  }
};

/**
 * Mark all messages in a conversation as read for a user
 * @param {string} conversationId - The conversation ID
 * @param {string} userId - The user ID
 * @returns {Promise<void>}
 */
export const markConversationMessagesAsRead = async (conversationId, userId) => {
  // This functionality has been simplified to remove read receipts
  // We're keeping the function to avoid breaking the API
  return Promise.resolve();
};

/**
 * Archive a conversation for a user
 * @param {string} conversationId - The conversation ID
 * @param {string} userId - The user ID
 * @returns {Promise<void>}
 */
export const archiveConversation = async (conversationId, userId) => {
  try {
    const conversationRef = doc(conversationsCollection, conversationId);
    
    // We'll store user preferences in the userConversations field
    // This allows different users to have different statuses for the same conversation
    await updateDoc(conversationRef, {
      [`userConversations.${userId}.status`]: ConversationStatus.ARCHIVED,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error archiving conversation:', error);
    throw error;
  }
};

/**
 * Get unread conversation count for a user
 * @param {string} userId - The user ID
 * @returns {Promise<number>} - Number of unread conversations
 */
export const getUnreadConversationCount = async (userId) => {
  try {
    const q = query(
      conversationsCollection,
      where('unreadByUsers', 'array-contains', userId)
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.size;
  } catch (error) {
    console.error('Error getting unread conversation count:', error);
    throw error;
  }
};

export default {
  getOrCreateConversation,
  findConversationBetweenUsers,
  getUserConversations,
  getConversationById,
  sendMessage,
  getConversationMessages,
  markConversationAsRead,
  markConversationMessagesAsRead,
  archiveConversation,
  getUnreadConversationCount,
  MessageType,
  ConversationStatus
};