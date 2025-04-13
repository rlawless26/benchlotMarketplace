/**
 * Firebase modules export file
 * This is the primary entry point for Firebase functionality
 */
import { app, auth, db, storage, functions, analytics } from './config';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { CartProvider, useCart } from './hooks/useCart';
import * as toolModel from './models/toolModel';
import * as cartModel from './models/cartModel';

export {
  app,
  auth,
  db,
  storage,
  functions,
  analytics,
  AuthProvider,
  useAuth,
  CartProvider,
  useCart,
  toolModel,
  cartModel
};