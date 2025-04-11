// src/App.js - Firebase Implementation
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { AuthProvider } from './firebase';
import AuthForm from './components/AuthForm';
import Marketplace from './components/Marketplace';
import ToolDetail from './components/ToolDetail';
import ToolListingForm from './components/ToolListingForm';
import MyListings from './components/MyListings';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <header className="App-header">
            <nav className="w-full max-w-7xl mx-auto px-4 flex flex-wrap items-center justify-between py-3">
              <div className="flex items-center">
                <Link to="/" className="text-white text-2xl font-bold">
                  Benchlot
                </Link>
              </div>
              
              <div className="flex items-center space-x-4">
                <Link to="/" className="text-white hover:text-blue-200">
                  Marketplace
                </Link>
                <Link to="/my-listings" className="text-white hover:text-blue-200">
                  My Listings
                </Link>
                <Link to="/tools/new" className="text-white hover:text-blue-200">
                  Add Tool
                </Link>
                <Link to="/login" className="text-white hover:text-blue-200">
                  Account
                </Link>
              </div>
            </nav>
          </header>
          
          <main className="py-6">
            <Routes>
              {/* Marketplace (Home) */}
              <Route path="/" element={<Marketplace />} />
              
              {/* Tool Routes */}
              <Route path="/tools/:id" element={<ToolDetail />} />
              <Route path="/tools/new" element={<ToolListingForm />} />
              <Route path="/tools/edit/:id" element={<ToolListingForm />} />
              
              {/* User Routes */}
              <Route path="/my-listings" element={<MyListings />} />
              <Route path="/login" element={<AuthForm />} />
              
              {/* Demo Auth Page */}
              <Route path="/demo" element={
                <div className="max-w-4xl mx-auto p-4">
                  <div className="migration-message mb-6">
                    <h2 className="text-2xl font-bold mb-2">Migrating from Supabase to Firebase</h2>
                    <p className="text-gray-600">
                      This is a clean implementation of Firebase authentication and Firestore for Benchlot.
                      The authentication component below demonstrates Firebase functionality.
                    </p>
                  </div>
                  
                  <div className="auth-container bg-white p-6 rounded-lg shadow-md">
                    <h3 className="text-xl font-semibold mb-2">Firebase Authentication Demo</h3>
                    <p className="text-gray-600 mb-4">
                      Try signing up or logging in below to test the Firebase authentication.
                      User data will be stored in Firestore.
                    </p>
                    
                    {/* Firebase Authentication Form */}
                    <AuthForm />
                    
                    <div className="firebase-status mt-6 border-t pt-4">
                      <h4 className="font-medium mb-2">Implementation Status:</h4>
                      <ul className="space-y-1">
                        <li>✅ Firebase Core Setup</li>
                        <li>✅ Authentication</li>
                        <li>✅ Firestore User Profiles</li>
                        <li>✅ Tool Listings & Marketplace</li>
                        <li>⏳ Stripe Integration</li>
                        <li>⏳ SendGrid Email Integration</li>
                      </ul>
                    </div>
                  </div>
                </div>
              } />
            </Routes>
          </main>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;