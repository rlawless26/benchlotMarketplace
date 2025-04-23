import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

/**
 * Fix seller status in user document
 * @param {string} userId - The user ID to fix
 * @returns {Promise<boolean>} - True if fixed, false if not needed
 */
export const fixSellerStatus = async (userId) => {
  if (!userId) return false;

  // Get user document
  const userRef = doc(db, 'users', userId);
  const userDoc = await getDoc(userRef);
  
  if (!userDoc.exists()) {
    console.log('fixSellerStatus: User document does not exist');
    return false;
  }
  
  const userData = userDoc.data();
  let needsFix = false;
  const updates = {};
  
  // Check for top-level isSeller flag
  if (userData.hasBankAccount === true && userData.verified === true && userData.isSeller !== true) {
    console.log('fixSellerStatus: Setting missing isSeller flag');
    updates.isSeller = true;
    needsFix = true;
  }
  
  // Check for profile.isSeller flag
  if (userData.isSeller === true && (!userData.profile || userData.profile.isSeller !== true)) {
    console.log('fixSellerStatus: Setting missing profile.isSeller flag');
    updates['profile.isSeller'] = true;
    needsFix = true;
  }
  
  // If user has completed bank details but stripeStatus is not set
  if (userData.hasBankAccount === true && userData.verified === true && 
      (!userData.stripeStatus || userData.stripeStatus === 'pending')) {
    console.log('fixSellerStatus: Setting stripeStatus to active');
    updates.stripeStatus = 'active';
    needsFix = true;
  }
  
  // Apply updates if needed
  if (needsFix) {
    try {
      await updateDoc(userRef, updates);
      console.log('fixSellerStatus: User document updated successfully');
      return true;
    } catch (error) {
      console.error('fixSellerStatus: Error updating user document:', error);
      return false;
    }
  }
  
  return false;
};

export default fixSellerStatus;