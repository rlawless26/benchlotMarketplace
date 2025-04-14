// Script to update cart totals
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc, updateDoc, collection, getDocs, query, where } = require('firebase/firestore');

// Initialize Firebase
const firebaseConfig = {
  apiKey: 'AIzaSyAzzPSBiOb-vPqNtaEYQfq2FgTHI1uydJ4',
  authDomain: 'benchlot-6d64e.firebaseapp.com',
  projectId: 'benchlot-6d64e',
  storageBucket: 'benchlot-6d64e.firebasestorage.app',
  messagingSenderId: '261795762325',
  appId: '1:261795762325:web:088e8fbcfaa2f8c6530b9c'
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Function to update a single cart
async function updateSingleCart(cartId) {
  try {
    console.log(`Updating cart: ${cartId}`);
    const cartRef = doc(db, 'carts', cartId);
    const cartDoc = await getDoc(cartRef);
    
    if (!cartDoc.exists()) {
      console.log(`Cart ${cartId} not found`);
      return false;
    }
    
    const cartData = cartDoc.data();
    console.log('Current cart data:', cartData);
    
    // Get items from the subcollection
    const itemsCollectionRef = collection(db, 'carts', cartId, 'items');
    const itemsSnapshot = await getDocs(itemsCollectionRef);
    
    let totalAmount = 0;
    let itemCount = 0;
    const items = [];
    
    itemsSnapshot.forEach((doc) => {
      const item = doc.data();
      console.log('Item:', item);
      if (item.price && item.quantity) {
        totalAmount += item.price * item.quantity;
        itemCount += item.quantity;
        items.push({
          id: doc.id,
          ...item
        });
      }
    });
    
    console.log(`Calculated values: itemCount=${itemCount}, totalAmount=${totalAmount}`);
    
    // Update the cart with correct values
    await updateDoc(cartRef, {
      itemCount,
      totalAmount,
      items // Also ensure the items array is up-to-date
    });
    
    console.log(`Cart ${cartId} updated successfully!`);
    return true;
  } catch (error) {
    console.error(`Error updating cart ${cartId}:`, error);
    return false;
  }
}

// Main function to update all active carts
async function updateAllCarts() {
  try {
    // Get specific cart if provided
    const specificCartId = 'WFaecgoBl5t9bsogt2n1';
    if (specificCartId) {
      const success = await updateSingleCart(specificCartId);
      console.log(`Update of specific cart ${specificCartId}: ${success ? 'Successful' : 'Failed'}`);
      return;
    }
    
    console.log('This would update all active carts');
  } catch (error) {
    console.error('Error updating carts:', error);
  }
}

updateAllCarts()
  .then(() => console.log('Cart update process completed'))
  .catch(err => console.error('Script error:', err));