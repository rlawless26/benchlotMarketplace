// Script to populate Benchlot with mock data for testing
const firebase = require('firebase/app');
require('firebase/firestore');
require('firebase/auth');
require('firebase/storage');

// Firebase config copied from your src/firebase/config.js
const firebaseConfig = {
  apiKey: "AIzaSyAzzPSBiOb-vPqNtaEYQfq2FgTHI1uydJ4",
  authDomain: "benchlot-6d64e.firebaseapp.com",
  projectId: "benchlot-6d64e",
  storageBucket: "benchlot-6d64e.firebasestorage.app",
  messagingSenderId: "261795762325",
  appId: "1:261795762325:web:088e8fbcfaa2f8c6530b9c",
  measurementId: "G-EDNXNY6RYM"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// Mock data
const mockUsers = [
  {
    email: 'seller1@example.com',
    password: 'Password123',
    profile: {
      displayName: 'Mike Johnson',
      fullName: 'Michael Johnson',
      bio: 'Professional woodworker with 15+ years of experience. I sell quality tools that I no longer need.',
      location: 'Portland, OR',
      role: 'seller',
      isSeller: true
    }
  },
  {
    email: 'seller2@example.com',
    password: 'Password123',
    profile: {
      displayName: 'Sarah Carpenter',
      fullName: 'Sarah Carpenter',
      bio: 'Workshop owner specializing in fine woodworking. Selling premium tools in excellent condition.',
      location: 'Austin, TX',
      role: 'seller',
      isSeller: true
    }
  },
  {
    email: 'buyer1@example.com',
    password: 'Password123',
    profile: {
      displayName: 'Alex Taylor',
      fullName: 'Alexander Taylor',
      bio: 'DIY enthusiast building out my home workshop. Looking for quality used tools.',
      location: 'Chicago, IL',
      role: 'user'
    }
  },
  {
    email: 'buyer2@example.com',
    password: 'Password123',
    profile: {
      displayName: 'Jamie Roberts',
      fullName: 'Jamie Roberts',
      bio: 'Furniture maker and hobbyist. Always on the lookout for great tools.',
      location: 'Denver, CO',
      role: 'user'
    }
  }
];

const toolCategories = [
  'Power Tools',
  'Hand Tools',
  'Woodworking',
  'Metalworking',
  'Measuring & Layout',
  'Gardening',
  'Automotive',
  'Electrical'
];

const toolConditions = [
  'New',
  'Like New',
  'Excellent',
  'Good',
  'Fair',
  'For Parts'
];

const mockTools = [
  {
    name: 'DeWalt Table Saw DWE7491RS',
    description: 'Professional 10-inch table saw with rolling stand. Only used for 2 projects, in excellent condition. Includes original blade and rip fence.',
    price: 399,
    originalPrice: 599,
    category: 'Power Tools',
    subcategory: 'Saws',
    brand: 'DeWalt',
    model: 'DWE7491RS',
    condition: 'Excellent',
    features: ['10-inch blade', 'Rolling stand', '32.5-inch rip capacity', '15-amp motor'],
    images: ['https://m.media-amazon.com/images/I/71g-qSeG1bL._AC_SL1500_.jpg'],
    shipping: {
      weight: 90,
      dimensions: '26.5 x 22 x 13 inches',
      freeShipping: true,
      localPickup: true
    }
  },
  {
    name: 'Makita Compound Miter Saw LS1019L',
    description: 'Dual-bevel sliding compound miter saw with laser. Purchased last year, used on a single project. Includes original blade and dust bag.',
    price: 489,
    originalPrice: 699,
    category: 'Power Tools',
    subcategory: 'Saws',
    brand: 'Makita',
    model: 'LS1019L',
    condition: 'Like New',
    features: ['10-inch blade', 'Dual-bevel sliding', 'LED light', 'Laser guide'],
    images: ['https://m.media-amazon.com/images/I/71HRFCRo-HL._AC_SL1500_.jpg'],
    shipping: {
      weight: 60,
      dimensions: '33 x 23 x 18 inches',
      freeShipping: true,
      localPickup: true
    }
  },
  {
    name: 'Vintage Stanley No. 4 Smoothing Plane',
    description: 'Classic Stanley No. 4 smoothing plane from the 1950s. Fully restored and tuned. Blade is sharp and ready to use.',
    price: 85,
    originalPrice: null,
    category: 'Hand Tools',
    subcategory: 'Planes',
    brand: 'Stanley',
    model: 'No. 4',
    condition: 'Good',
    features: ['2-inch blade', 'Rosewood handle', 'Brass hardware'],
    images: ['https://www.leevalley.com/images/item/zoom/05p4035z01.jpg'],
    shipping: {
      weight: 4,
      dimensions: '10 x 3 x 4 inches',
      freeShipping: true,
      localPickup: true
    }
  },
  {
    name: 'Festool Domino DF 500 Joiner',
    description: 'Professional Festool Domino joiner. This is the DF 500 model in excellent condition. Includes case and standard accessories.',
    price: 749,
    originalPrice: 995,
    category: 'Power Tools',
    subcategory: 'Joiners',
    brand: 'Festool',
    model: 'DF 500',
    condition: 'Excellent',
    features: ['Variable cutting width', 'Dust extraction port', 'Quick change system'],
    images: ['https://cdn.stokker.com/prod/l/517/577517l.jpg'],
    shipping: {
      weight: 15,
      dimensions: '18 x 14 x 8 inches',
      freeShipping: true,
      localPickup: true
    }
  },
  {
    name: 'Starrett Combination Square Set',
    description: 'Professional Starrett combination square set. Includes 12-inch square, center head, and protractor head. In excellent condition with original case.',
    price: 165,
    originalPrice: 225,
    category: 'Measuring & Layout',
    subcategory: 'Squares',
    brand: 'Starrett',
    model: 'C435-12-4R',
    condition: 'Excellent',
    features: ['12-inch blade', 'Center head', 'Protractor head', 'Cast iron heads'],
    images: ['https://www.starrett.com/getattachment/6a01be47-f92e-48e4-8adc-a1d6b8f42fc1/C435-12.jpg'],
    shipping: {
      weight: 3,
      dimensions: '16 x 8 x 3 inches',
      freeShipping: true,
      localPickup: true
    }
  },
  {
    name: 'Milwaukee M18 Drill/Driver Kit',
    description: 'Milwaukee M18 cordless drill/driver kit with two batteries, charger, and case. Light use, excellent condition.',
    price: 139,
    originalPrice: 199,
    category: 'Power Tools',
    subcategory: 'Drills',
    brand: 'Milwaukee',
    model: 'M18',
    condition: 'Excellent',
    features: ['18V motor', '2 batteries included', 'LED light', 'All-metal chuck'],
    images: ['https://images.thdstatic.com/productImages/aa7cddce-8623-4c6d-885f-336a859fe10d/svn/milwaukee-power-tool-combo-kits-2997-23po-64_1000.jpg'],
    shipping: {
      weight: 9,
      dimensions: '16 x 14 x 5 inches',
      freeShipping: true,
      localPickup: true
    }
  },
  {
    name: 'Lie-Nielsen No. 7 Jointer Plane',
    description: 'Premium Lie-Nielsen No. 7 jointer plane. Purchased new and used on a few projects. In excellent condition with original box.',
    price: 425,
    originalPrice: 525,
    category: 'Hand Tools',
    subcategory: 'Planes',
    brand: 'Lie-Nielsen',
    model: 'No. 7',
    condition: 'Excellent',
    features: ['22-inch sole', 'A2 steel blade', 'Cherry handle', 'Bronze lever cap'],
    images: ['https://cdn.lie-nielsen.com/wp-content/uploads/1994/11/22135203/7-jointer-bench-plane-A_1.jpg'],
    shipping: {
      weight: 10,
      dimensions: '24 x 6 x 6 inches',
      freeShipping: true,
      localPickup: true
    }
  },
  {
    name: 'Bosch 1617EVSPK Router Kit',
    description: 'Bosch 1617EVSPK router kit with fixed and plunge bases. Used on a few projects, in excellent condition.',
    price: 189,
    originalPrice: 249,
    category: 'Power Tools',
    subcategory: 'Routers',
    brand: 'Bosch',
    model: '1617EVSPK',
    condition: 'Excellent',
    features: ['2.25 HP motor', 'Fixed and plunge bases', 'Variable speed', 'Soft start'],
    images: ['https://m.media-amazon.com/images/I/71+-4tCi7AL._AC_SL1500_.jpg'],
    shipping: {
      weight: 18,
      dimensions: '12 x 10 x 8 inches',
      freeShipping: true,
      localPickup: true
    }
  }
];

// Function to create users
async function createUsers() {
  console.log('Creating mock users...');
  const userIds = {};
  
  for (const user of mockUsers) {
    try {
      // Create user with email and password
      const userCredential = await auth.createUserWithEmailAndPassword(user.email, user.password);
      const uid = userCredential.user.uid;
      
      // Update display name
      await userCredential.user.updateProfile({
        displayName: user.profile.displayName
      });
      
      // Save profile data to Firestore
      await db.collection('users').doc(uid).set({
        uid,
        email: user.email,
        displayName: user.profile.displayName,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        role: user.profile.role || 'user',
        profile: {
          fullName: user.profile.fullName,
          bio: user.profile.bio,
          location: user.profile.location
        }
      });
      
      // Store user ID for later use
      userIds[user.email] = uid;
      console.log(`Created user: ${user.email} with ID: ${uid}`);
    } catch (error) {
      console.error(`Error creating user ${user.email}:`, error);
    }
  }
  
  return userIds;
}

// Function to create tools
async function createTools(userIds) {
  console.log('Creating mock tools...');
  
  const sellerIds = [userIds['seller1@example.com'], userIds['seller2@example.com']];
  
  for (let i = 0; i < mockTools.length; i++) {
    const tool = mockTools[i];
    const sellerId = sellerIds[i % sellerIds.length]; // Alternate between sellers
    
    try {
      const toolRef = await db.collection('tools').add({
        name: tool.name,
        description: tool.description,
        price: tool.price,
        originalPrice: tool.originalPrice,
        category: tool.category,
        subcategory: tool.subcategory,
        brand: tool.brand,
        model: tool.model,
        condition: tool.condition,
        features: tool.features,
        images: tool.images,
        shipping: tool.shipping,
        user_id: sellerId,
        status: 'active',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      console.log(`Created tool: ${tool.name} with ID: ${toolRef.id}`);
    } catch (error) {
      console.error(`Error creating tool ${tool.name}:`, error);
    }
  }
}

// Function to create wishlists
async function createWishlists(userIds) {
  console.log('Creating mock wishlists...');
  
  // Get all tool IDs
  const toolsSnapshot = await db.collection('tools').get();
  const toolIds = toolsSnapshot.docs.map(doc => doc.id);
  
  const buyerIds = [userIds['buyer1@example.com'], userIds['buyer2@example.com']];
  
  for (const buyerId of buyerIds) {
    try {
      // Create wishlist document
      const wishlistRef = db.collection('wishlists').doc(buyerId);
      
      // Add 2-3 random tools to each buyer's wishlist
      const numTools = 2 + Math.floor(Math.random() * 2); // 2 or 3
      const savedTools = [];
      
      for (let i = 0; i < numTools; i++) {
        const randomIndex = Math.floor(Math.random() * toolIds.length);
        const toolId = toolIds[randomIndex];
        
        savedTools.push(toolId);
        
        // Also add as individual items in subcollection
        await wishlistRef.collection('items').doc(toolId).set({
          toolId,
          savedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      }
      
      // Update main wishlist document
      await wishlistRef.set({
        savedTools,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      console.log(`Created wishlist for user: ${buyerId} with ${numTools} tools`);
    } catch (error) {
      console.error(`Error creating wishlist for user ${buyerId}:`, error);
    }
  }
}

// Function to create offers and messages
async function createOffersAndMessages(userIds) {
  console.log('Creating mock offers and messages...');
  
  // Get tool IDs and seller IDs
  const toolsSnapshot = await db.collection('tools').get();
  const tools = toolsSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
  
  const buyerIds = [userIds['buyer1@example.com'], userIds['buyer2@example.com']];
  
  // Create 3-4 offers
  const numOffers = 3 + Math.floor(Math.random() * 2);
  
  for (let i = 0; i < numOffers; i++) {
    try {
      const randomToolIndex = Math.floor(Math.random() * tools.length);
      const tool = tools[randomToolIndex];
      const buyerId = buyerIds[i % buyerIds.length];
      const sellerId = tool.user_id;
      
      // Calculate a random offer price (70-90% of listing price)
      const offerPercentage = 70 + Math.floor(Math.random() * 20);
      const offerPrice = Math.round(tool.price * offerPercentage / 100);
      
      // Create offer
      const offerRef = await db.collection('offers').add({
        toolId: tool.id,
        toolTitle: tool.name,
        buyerId,
        sellerId,
        originalPrice: tool.price,
        currentPrice: offerPrice,
        status: 'pending',
        isActive: true,
        hasUnreadMessagesBuyer: false,
        hasUnreadMessagesSeller: true,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        expiresAt: new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)) // 7 days from now
      });
      
      // Add initial offer message
      await offerRef.collection('messages').add({
        senderId: buyerId,
        recipientId: sellerId,
        messageType: 'offer',
        price: offerPrice,
        message: `I'd like to offer ${offerPrice} for this tool. Would you consider this offer?`,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        isRead: false
      });
      
      console.log(`Created offer for tool: ${tool.name} with price: $${offerPrice}`);
    } catch (error) {
      console.error(`Error creating offer:`, error);
    }
  }
}

// Function to create direct messages
async function createDirectMessages(userIds) {
  console.log('Creating mock direct messages...');
  
  // Get all users
  const sellerIds = [userIds['seller1@example.com'], userIds['seller2@example.com']];
  const buyerIds = [userIds['buyer1@example.com'], userIds['buyer2@example.com']];
  
  // Create conversations between buyers and sellers
  for (let i = 0; i < sellerIds.length; i++) {
    for (let j = 0; j < buyerIds.length; j++) {
      // Skip some combinations to make the data more realistic
      if (Math.random() > 0.75) continue;
      
      try {
        const sellerId = sellerIds[i];
        const buyerId = buyerIds[j];
        
        // Get user display names from users collection
        const sellerDoc = await db.collection('users').doc(sellerId).get();
        const buyerDoc = await db.collection('users').doc(buyerId).get();
        
        const sellerName = sellerDoc.data().displayName || 'Seller';
        const buyerName = buyerDoc.data().displayName || 'Buyer';
        
        // Create conversation
        const conversationRef = await db.collection('conversations').add({
          participants: [sellerId, buyerId],
          participantNames: {
            [sellerId]: sellerName,
            [buyerId]: buyerName
          },
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
          lastMessageAt: firebase.firestore.FieldValue.serverTimestamp(),
          lastMessageText: '',
          unreadByUsers: [],
          status: 'active'
        });
        
        // Add 2-5 messages to the conversation
        const numMessages = 2 + Math.floor(Math.random() * 4);
        
        const messages = [
          {
            senderId: buyerId,
            text: `Hi ${sellerName}! I saw your listings and I'm interested in your tools. Do you ship to Chicago?`,
            type: 'text',
            isRead: true
          },
          {
            senderId: sellerId,
            text: `Hello ${buyerName}! Yes, I do ship to Chicago. Shipping costs depend on the item's size and weight. Is there something specific you're looking at?`,
            type: 'text',
            isRead: true
          },
          {
            senderId: buyerId,
            text: `Great! I'm looking for quality woodworking tools. I noticed you have some premium brands. Are all your items in good working condition?`,
            type: 'text',
            isRead: true
          },
          {
            senderId: sellerId,
            text: `Absolutely! All my tools are in excellent working condition. I only sell items that I would buy myself. Feel free to ask if you want more detailed photos of any specific item.`,
            type: 'text',
            isRead: false
          },
          {
            senderId: buyerId,
            text: `That's perfect. I'll check your inventory and get back to you soon. Thanks for the quick responses!`,
            type: 'text',
            isRead: false
          }
        ];
        
        // Add messages in chronological order
        for (let k = 0; k < Math.min(numMessages, messages.length); k++) {
          const message = messages[k];
          
          // Add a small delay to message timestamps to create a realistic conversation flow
          const messageDate = new Date();
          messageDate.setHours(messageDate.getHours() - (numMessages - k));
          
          await conversationRef.collection('messages').add({
            ...message,
            createdAt: firebase.firestore.Timestamp.fromDate(messageDate)
          });
          
          // Update conversation with last message
          if (k === Math.min(numMessages, messages.length) - 1) {
            // Mark conversation as unread for recipient of last message
            const recipientId = message.senderId === sellerId ? buyerId : sellerId;
            
            await conversationRef.update({
              lastMessageAt: firebase.firestore.Timestamp.fromDate(messageDate),
              lastMessageText: message.text,
              unreadByUsers: [recipientId]
            });
          }
        }
        
        console.log(`Created conversation between ${sellerName} and ${buyerName} with ${Math.min(numMessages, messages.length)} messages`);
      } catch (error) {
        console.error(`Error creating conversation:`, error);
      }
    }
  }
}

// Main function to execute the script
async function populateMockData() {
  console.log('Starting to populate mock data...');
  
  try {
    // Create users first
    const userIds = await createUsers();
    
    // Create tools
    await createTools(userIds);
    
    // Create wishlists
    await createWishlists(userIds);
    
    // Create offers and messages
    await createOffersAndMessages(userIds);
    
    // Create direct messages
    await createDirectMessages(userIds);
    
    console.log('Mock data population complete!');
  } catch (error) {
    console.error('Error populating mock data:', error);
  }
}

// Execute the script
populateMockData();