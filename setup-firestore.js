const admin = require('firebase-admin');
const serviceAccount = require('./service-account-key.json');

// Initialize Firebase Admin with your service account
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Create user document
async function createUserDocument() {
  const userId = 'LArZhGrspcOaAqfMjyhLh5Wm5MJ2';
  
  try {
    await db.collection('users').doc(userId).set({
      uid: userId,
      email: 'rob@benchlot.com',
      displayName: 'rob',
      role: 'user',
      createdAt: new Date().toISOString(),
      photoURL: null,
      profile: {
        fullName: '',
        bio: '',
        location: ''
      }
    });
    
    console.log('User document created successfully');
    
    // Create placeholder documents for wishlists and tools collections
    await db.collection('wishlists').doc('placeholder').set({
      placeholder: true,
      createdAt: new Date().toISOString()
    });
    
    await db.collection('tools').doc('placeholder').set({
      placeholder: true,
      createdAt: new Date().toISOString()
    });
    
    console.log('Placeholder documents created successfully');
  } catch (error) {
    console.error('Error creating documents:', error);
  }
}

createUserDocument()
  .then(() => {
    console.log('All documents created successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });