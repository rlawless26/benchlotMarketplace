/**
 * Factory functions for creating mock hook return values.
 * Used across all test files for consistent mock data.
 */

// --- Users ---

export const createMockUser = (overrides = {}) => ({
  uid: 'user-123',
  email: 'test@example.com',
  displayName: 'Test User',
  photoURL: null,
  isSeller: false,
  profile: {
    isSeller: false,
    firstName: 'Test',
    lastName: 'User',
  },
  ...overrides,
});

export const createMockSellerUser = (overrides = {}) =>
  createMockUser({
    isSeller: true,
    profile: { isSeller: true, firstName: 'Seller', lastName: 'User' },
    ...overrides,
  });

// --- Auth hook ---

export const createMockAuthValue = (overrides = {}) => ({
  user: null,
  loading: false,
  isAuthenticated: jest.fn(() => false),
  signIn: jest.fn().mockResolvedValue({ error: null }),
  signUp: jest.fn().mockResolvedValue({ error: null }),
  signOut: jest.fn().mockResolvedValue({ success: true }),
  resetPassword: jest.fn().mockResolvedValue({ success: true }),
  signInWithGoogle: jest.fn().mockResolvedValue({ error: null }),
  signInWithFacebook: jest.fn().mockResolvedValue({ error: null }),
  ...overrides,
});

export const createAuthenticatedAuthValue = (userOverrides = {}, overrides = {}) => {
  const user = createMockUser(userOverrides);
  return createMockAuthValue({
    user,
    isAuthenticated: jest.fn(() => true),
    ...overrides,
  });
};

// --- Cart hook ---

export const createMockCartItem = (overrides = {}) => ({
  id: 'cart-item-1',
  toolId: 'tool-1',
  name: 'Stanley No. 4 Plane',
  price: 150,
  quantity: 1,
  imageUrl: 'https://example.com/plane.jpg',
  ...overrides,
});

export const createMockCartValue = (overrides = {}) => ({
  cart: { items: [] },
  loading: false,
  error: null,
  addToCart: jest.fn().mockResolvedValue({}),
  removeItem: jest.fn().mockResolvedValue({}),
  updateItemQuantity: jest.fn().mockResolvedValue({}),
  emptyCart: jest.fn().mockResolvedValue({}),
  isItemInCart: jest.fn(() => false),
  itemCount: 0,
  ...overrides,
});

// --- Tool data ---

export const createMockTool = (overrides = {}) => ({
  id: 'tool-1',
  name: 'Stanley No. 4 Smoothing Plane',
  price: 150,
  current_price: 150,
  original_price: 200,
  category: 'Hand Planes',
  subcategory: 'Smoothing Planes',
  condition: 'Good',
  brand: 'Stanley',
  description: 'A classic Stanley No. 4 smoothing plane in good condition.',
  location: 'Boston, MA',
  images: [{ url: 'https://example.com/plane.jpg' }],
  verified: false,
  featured: false,
  status: 'active',
  user_id: 'seller-456',
  sellerId: 'seller-456',
  seller_rating: 4.5,
  ...overrides,
});

// --- Wishlist hook ---

export const createMockWishlistValue = (overrides = {}) => ({
  wishlist: [],
  loading: false,
  count: 0,
  addToWishlist: jest.fn().mockResolvedValue({}),
  removeFromWishlist: jest.fn().mockResolvedValue({}),
  toggleWishlist: jest.fn().mockResolvedValue({}),
  isInWishlist: jest.fn(() => false),
  ...overrides,
});

// --- Notifications hook ---

export const createMockNotificationsValue = (overrides = {}) => ({
  buyerCount: 0,
  sellerCount: 0,
  totalCount: 0,
  notifications: [],
  loading: false,
  markAsRead: jest.fn(),
  ...overrides,
});

// --- Messages hook ---

export const createMockMessagesValue = (overrides = {}) => ({
  conversations: [],
  unreadCount: 0,
  loading: false,
  sendMessage: jest.fn().mockResolvedValue({}),
  markAsRead: jest.fn().mockResolvedValue({}),
  ...overrides,
});

// --- Offers hook ---

export const createMockOffersValue = (overrides = {}) => ({
  loading: false,
  error: null,
  buyerOffers: [],
  sellerOffers: [],
  toolOffers: [],
  activeOffers: [],
  createOffer: jest.fn().mockResolvedValue({ id: 'offer-1' }),
  createOfferFromConversation: jest.fn().mockResolvedValue({ id: 'offer-1' }),
  getOffersForConversation: jest.fn().mockResolvedValue([]),
  acceptOffer: jest.fn().mockResolvedValue({}),
  counterOffer: jest.fn().mockResolvedValue({}),
  declineOffer: jest.fn().mockResolvedValue({}),
  cancelOffer: jest.fn().mockResolvedValue({}),
  addMessage: jest.fn().mockResolvedValue({}),
  getMessages: jest.fn().mockResolvedValue([]),
  markOfferAsRead: jest.fn().mockResolvedValue({}),
  hasUnreadOffers: false,
  OfferStatus: {
    PENDING: 'pending',
    ACCEPTED: 'accepted',
    COUNTERED: 'countered',
    DECLINED: 'declined',
    EXPIRED: 'expired',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
  },
  ...overrides,
});

// --- Offer data ---

export const createMockOffer = (overrides = {}) => ({
  id: 'offer-1',
  toolId: 'tool-1',
  toolTitle: 'Stanley No. 4 Smoothing Plane',
  buyerId: 'user-123',
  sellerId: 'seller-456',
  originalPrice: 150,
  currentPrice: 120,
  status: 'pending',
  isActive: true,
  hasUnreadMessagesBuyer: false,
  hasUnreadMessagesSeller: true,
  conversationId: null,
  createdAt: { seconds: Date.now() / 1000 },
  updatedAt: { seconds: Date.now() / 1000 },
  ...overrides,
});

// --- Conversation data ---

export const createMockConversation = (overrides = {}) => ({
  id: 'convo-1',
  participants: ['user-123', 'seller-456'],
  participantNames: {
    'user-123': 'Test User',
    'seller-456': 'Seller User',
  },
  metadata: {
    topic: 'About: Stanley No. 4 Smoothing Plane',
    toolId: 'tool-1',
    toolName: 'Stanley No. 4 Smoothing Plane',
    toolImage: 'https://example.com/plane.jpg',
    toolPrice: 150,
  },
  lastMessageAt: { seconds: Date.now() / 1000 },
  lastMessageText: 'Is this still available?',
  unreadByUsers: [],
  hasUnread: false,
  status: 'active',
  ...overrides,
});

// --- Notification Context ---

export const createMockNotificationContextValue = (overrides = {}) => ({
  activeNotifications: [],
  showNotification: jest.fn(),
  ...overrides,
});
