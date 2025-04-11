/**
 * Firebase modules export file
 * This is the primary entry point for Firebase functionality
 */
import { app, auth, db, storage, functions, analytics } from './config';
import { AuthProvider, useAuth } from './hooks/useAuth';
import * as toolModel from './models/toolModel';

export {
  app,
  auth,
  db,
  storage,
  functions,
  analytics,
  AuthProvider,
  useAuth,
  toolModel
};