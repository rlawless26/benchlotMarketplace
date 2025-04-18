/**
 * Firebase modules export file
 * This is the primary entry point for Firebase functionality
 */
import { app, auth, db, storage, functions, analytics } from './config';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { CartProvider, useCart } from './hooks/useCart';
import { useOffers } from './hooks/useOffers';
import * as toolModel from './models/toolModel';
import * as cartModel from './models/cartModel';
import * as offerModel from './models/offerModel';

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
  useOffers,
  toolModel,
  cartModel,
  offerModel
};