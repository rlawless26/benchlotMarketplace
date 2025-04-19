/**
 * Mock data for testing and development purposes
 */

// Mock users
export const mockUsers = [
  {
    id: 'user1',
    displayName: 'John Carpenter',
    email: 'john.carpenter@example.com',
    role: 'seller',
    profile: {
      fullName: 'John A. Carpenter',
      bio: 'Master carpenter with 20+ years of experience. Looking to sell quality tools that have served me well.',
      location: 'Seattle, WA',
      phone: '206-555-1234'
    },
    isSeller: true
  },
  {
    id: 'user2',
    displayName: 'Emily Wood',
    email: 'emily.wood@example.com',
    role: 'seller',
    profile: {
      fullName: 'Emily J. Wood',
      bio: 'Furniture maker specializing in mid-century modern designs. Selling tools to upgrade my workshop.',
      location: 'Brooklyn, NY',
      phone: '718-555-6789'
    },
    isSeller: true
  },
  {
    id: 'user3',
    displayName: 'Sarah DIY',
    email: 'sarah.diy@example.com',
    role: 'user',
    profile: {
      fullName: 'Sarah R. Johnson',
      bio: 'DIY enthusiast and blogger. Building my tool collection for home projects.',
      location: 'Chicago, IL',
      phone: '312-555-3579'
    }
  },
  {
    id: 'user4',
    displayName: 'Mike Hobbyist',
    email: 'mike.hobbyist@example.com',
    role: 'user',
    profile: {
      fullName: 'Michael P. Smith',
      bio: 'Weekend woodworker looking for quality used tools to expand my small shop.',
      location: 'Denver, CO',
      phone: '303-555-7913'
    }
  }
];

// Mock tools
export const mockTools = [
  {
    id: 'tool1',
    name: 'Milwaukee M18 FUEL Impact Driver Kit',
    description: 'Powerful M18 FUEL impact driver with 2 batteries, charger, and case. Used for only one home renovation project. Like new condition.',
    price: 179,
    originalPrice: 249,
    category: 'Power Tools',
    subcategory: 'Drills & Drivers',
    brand: 'Milwaukee',
    model: '2853-22',
    condition: 'Like New',
    features: ['18V Brushless Motor', '2 Batteries Included', 'LED Light', '1/4" Hex Chuck'],
    images: ['/images/powertools.webp'],
    shipping: {
      weight: 8,
      dimensions: '16 x 13 x 5 inches',
      freeShipping: true,
      localPickup: true
    },
    user_id: 'user1',
    status: 'active',
    createdAt: { seconds: Date.now() / 1000 - 86400 * 7 }, // 7 days ago
    updatedAt: { seconds: Date.now() / 1000 - 86400 * 3 } // 3 days ago
  },
  {
    id: 'tool2',
    name: 'Veritas Low-Angle Jack Plane',
    description: 'Premium Veritas low-angle jack plane. Used for a few furniture projects. Blade is sharp and in excellent condition.',
    price: 225,
    originalPrice: 320,
    category: 'Hand Tools',
    subcategory: 'Planes',
    brand: 'Veritas',
    model: '05P22.01',
    condition: 'Excellent',
    features: ['PM-V11 Blade', 'Adjustable Mouth', 'Ductile Iron Body', 'Low 12° Bed Angle'],
    images: ['/images/handtools.jpg'],
    shipping: {
      weight: 7,
      dimensions: '17 x 6 x 4 inches',
      freeShipping: true,
      localPickup: true
    },
    user_id: 'user2',
    status: 'active',
    createdAt: { seconds: Date.now() / 1000 - 86400 * 10 }, // 10 days ago
    updatedAt: { seconds: Date.now() / 1000 - 86400 * 5 } // 5 days ago
  },
  {
    id: 'tool3',
    name: 'SawStop 3HP Professional Cabinet Saw',
    description: 'SawStop Professional Cabinet Saw with 36" T-Glide fence. Used in my professional shop, well-maintained and in excellent condition.',
    price: 2200,
    originalPrice: 3299,
    category: 'Power Tools',
    subcategory: 'Table Saws',
    brand: 'SawStop',
    model: 'PCS31230-TGP236',
    condition: 'Excellent',
    features: ['3HP Motor', '36" T-Glide Fence', 'Safety Brake Technology', 'Cast Iron Table'],
    images: ['/images/workshopequipment.jpg'],
    shipping: {
      weight: 338,
      dimensions: '62 x 41 x 40 inches',
      freeShipping: false,
      localPickup: true,
      shippingCost: 250
    },
    user_id: 'user1',
    status: 'active',
    createdAt: { seconds: Date.now() / 1000 - 86400 * 15 }, // 15 days ago
    updatedAt: { seconds: Date.now() / 1000 - 86400 * 12 } // 12 days ago
  },
  {
    id: 'tool4',
    name: 'Festool TS 55 REQ Track Saw',
    description: 'Festool TS 55 REQ track saw with 55" guide rail. Used for a kitchen renovation. Includes blade and systainer case.',
    price: 475,
    originalPrice: 675,
    category: 'Power Tools',
    subcategory: 'Saws',
    brand: 'Festool',
    model: 'TS 55 REQ',
    condition: 'Very Good',
    features: ['Plunge Cut Design', '55" Guide Rail', 'Dust Collection', 'Systainer Case'],
    images: ['/images/powertools.webp'],
    shipping: {
      weight: 22,
      dimensions: '59 x 12 x 8 inches',
      freeShipping: true,
      localPickup: true
    },
    user_id: 'user2',
    status: 'active',
    createdAt: { seconds: Date.now() / 1000 - 86400 * 5 }, // 5 days ago
    updatedAt: { seconds: Date.now() / 1000 - 86400 * 2 } // 2 days ago
  },
  {
    id: 'tool5',
    name: 'Vintage Stanley Bedrock No. 605 Plane',
    description: 'Restored vintage Stanley Bedrock No. 605 plane from the 1920s. Fully tuned and sharpened. Collector\'s item and a great user plane.',
    price: 295,
    originalPrice: null,
    category: 'Hand Tools',
    subcategory: 'Planes',
    brand: 'Stanley',
    model: 'Bedrock No. 605',
    condition: 'Restored',
    features: ['Flat Sides', 'Original Iron', 'Restored Tote and Knob', 'Frog Adjustment Screw'],
    images: ['/images/handtools.jpg'],
    shipping: {
      weight: 6,
      dimensions: '14 x 3 x 4 inches',
      freeShipping: true,
      localPickup: true
    },
    user_id: 'user1',
    status: 'active',
    createdAt: { seconds: Date.now() / 1000 - 86400 * 3 }, // 3 days ago
    updatedAt: { seconds: Date.now() / 1000 - 86400 * 1 } // 1 day ago
  },
  {
    id: 'tool6',
    name: 'Makita 18V LXT Brushless 7-Tool Combo Kit',
    description: 'Complete Makita 18V LXT brushless tool kit with drill, impact driver, circular saw, reciprocating saw, grinder, light, and vacuum. Includes 4 batteries, dual charger, and bags.',
    price: 749,
    originalPrice: 999,
    category: 'Power Tools',
    subcategory: 'Tool Sets',
    brand: 'Makita',
    model: 'XT706',
    condition: 'Very Good',
    features: ['7-Tool Set', 'Brushless Motors', '4 Batteries', 'Star Protection'],
    images: ['/images/powertools.webp'],
    shipping: {
      weight: 40,
      dimensions: '24 x 18 x 14 inches',
      freeShipping: true,
      localPickup: true
    },
    user_id: 'user2',
    status: 'active',
    createdAt: { seconds: Date.now() / 1000 - 86400 * 8 }, // 8 days ago
    updatedAt: { seconds: Date.now() / 1000 - 86400 * 4 } // 4 days ago
  }
];

// Mock orders
export const mockOrders = [
  {
    id: 'order1',
    userId: 'user3',
    items: [
      {
        toolId: 'tool1',
        name: 'Milwaukee M18 FUEL Impact Driver Kit',
        price: 179,
        quantity: 1,
        image: '/images/powertools.webp'
      }
    ],
    totalAmount: 179,
    status: 'completed',
    payment: {
      method: 'card',
      last4: '4242'
    },
    shipping: {
      address: {
        line1: '123 Main St',
        city: 'Chicago',
        state: 'IL',
        postal_code: '60601',
        country: 'US'
      },
      carrier: 'UPS',
      tracking: 'UPS12345678'
    },
    createdAt: { seconds: Date.now() / 1000 - 86400 * 20 }, // 20 days ago
    updatedAt: { seconds: Date.now() / 1000 - 86400 * 19 } // 19 days ago
  },
  {
    id: 'order2',
    userId: 'user4',
    items: [
      {
        toolId: 'tool2',
        name: 'Veritas Low-Angle Jack Plane',
        price: 225,
        quantity: 1,
        image: '/images/handtools.jpg'
      },
      {
        toolId: 'tool5',
        name: 'Vintage Stanley Bedrock No. 605 Plane',
        price: 295,
        quantity: 1,
        image: '/images/handtools.jpg'
      }
    ],
    totalAmount: 520,
    status: 'shipped',
    payment: {
      method: 'card',
      last4: '1234'
    },
    shipping: {
      address: {
        line1: '456 Oak Ave',
        city: 'Denver',
        state: 'CO',
        postal_code: '80202',
        country: 'US'
      },
      carrier: 'FedEx',
      tracking: 'FDX87654321'
    },
    createdAt: { seconds: Date.now() / 1000 - 86400 * 10 }, // 10 days ago
    updatedAt: { seconds: Date.now() / 1000 - 86400 * 8 } // 8 days ago
  },
  {
    id: 'order3',
    userId: 'user3',
    items: [
      {
        toolId: 'tool4',
        name: 'Festool TS 55 REQ Track Saw',
        price: 475,
        quantity: 1,
        image: '/images/powertools.webp'
      }
    ],
    totalAmount: 475,
    status: 'paid',
    payment: {
      method: 'card',
      last4: '4242'
    },
    shipping: {
      address: {
        line1: '123 Main St',
        city: 'Chicago',
        state: 'IL',
        postal_code: '60601',
        country: 'US'
      },
      carrier: null,
      tracking: null
    },
    createdAt: { seconds: Date.now() / 1000 - 86400 * 1 }, // 1 day ago
    updatedAt: { seconds: Date.now() / 1000 - 86400 * 1 } // 1 day ago
  }
];

// Mock carts
export const mockCarts = [
  {
    id: 'cart1',
    userId: 'user3',
    items: [
      {
        toolId: 'tool3',
        name: 'SawStop 3HP Professional Cabinet Saw',
        price: 2200,
        quantity: 1,
        image: '/images/workshopequipment.jpg'
      }
    ],
    totalAmount: 2200,
    itemCount: 1,
    status: 'active',
    createdAt: { seconds: Date.now() / 1000 - 86400 * 2 }, // 2 days ago
    updatedAt: { seconds: Date.now() / 1000 - 86400 * 1 } // 1 day ago
  },
  {
    id: 'cart2',
    userId: 'user4',
    items: [
      {
        toolId: 'tool6',
        name: 'Makita 18V LXT Brushless 7-Tool Combo Kit',
        price: 749,
        quantity: 1,
        image: '/images/powertools.webp'
      }
    ],
    totalAmount: 749,
    itemCount: 1,
    status: 'active',
    createdAt: { seconds: Date.now() / 1000 - 86400 * 3 }, // 3 days ago
    updatedAt: { seconds: Date.now() / 1000 - 86400 * 1 } // 1 day ago
  }
];

// Helper function to get mock data by ID
export const getMockToolById = (id) => {
  return mockTools.find(tool => tool.id === id) || null;
};

export const getMockOrderById = (id) => {
  return mockOrders.find(order => order.id === id) || null;
};

export const getMockUserById = (id) => {
  return mockUsers.find(user => user.id === id) || null;
};

export const getMockCartById = (id) => {
  return mockCarts.find(cart => cart.id === id) || null;
};

export default {
  mockUsers,
  mockTools,
  mockOrders,
  mockCarts,
  getMockToolById,
  getMockOrderById,
  getMockUserById,
  getMockCartById
};