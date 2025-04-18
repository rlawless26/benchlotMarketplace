/**
 * Utility functions for testing notifications in the application
 */
import { 
  doc, 
  updateDoc, 
  serverTimestamp,
  collection,
  getDoc,
  addDoc,
  Timestamp
} from 'firebase/firestore';
import { db } from '../config';
import { OfferStatus, createMockOffer } from './offerModel';

/**
 * Create a test notification by marking an offer as unread
 * @param {string} userId - User ID to create a notification for
 * @param {string} offerId - Offer ID (optional, will use mock if not provided)
 * @returns {Promise<Object>} - The updated offer
 */
export const triggerTestNotification = async (userId) => {
  try {
    // Instead of creating a real mock offer which requires extra permissions,
    // we'll simulate a notification on the client side
    
    // Create a simulated offer notification
    const mockNotification = {
      id: `mock-offer-${Date.now()}`,
      toolId: 'mock-tool-123',
      toolTitle: 'DeWalt Power Drill',
      buyerId: userId,
      sellerId: 'mock-seller-456',
      originalPrice: 199.99,
      currentPrice: 149.99,
      status: 'pending',
      isActive: true,
      hasUnreadMessagesBuyer: true,
      hasUnreadMessagesSeller: false,
      updatedAt: new Date(),
      message: 'This is a test notification message.',
      fromSeller: true
    };
    
    // Return the mock notification
    return {
      ...mockNotification,
      success: true,
      mockOnly: true // Flag to indicate this is a client-side mock
    };
  } catch (error) {
    console.error('Error triggering test notification:', error);
    throw error;
  }
};

export default {
  triggerTestNotification
};