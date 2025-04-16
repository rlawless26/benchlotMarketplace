/**
 * Firebase Models
 * 
 * This file exports all data models to provide a consistent API
 * for working with Firestore data.
 */

// Export model modules
export * from './toolModel';
export * from './userModel';
export * from './cartModel';
export * from './orderModel';

// Re-export specific models for convenience
import * as toolModel from './toolModel';
import * as userModel from './userModel';
import * as cartModel from './cartModel';
import * as orderModel from './orderModel';

// Default export as a unified API
export default {
  tools: toolModel,
  users: userModel,
  carts: cartModel,
  orders: orderModel
};