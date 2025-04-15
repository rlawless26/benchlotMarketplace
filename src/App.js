// src/App.js - Firebase Implementation
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider, CartProvider } from './firebase';

// Page imports
import LandingPage from './Pages/LandingPage';
import MarketplacePage from './Pages/MarketplacePage';
import ToolDetailPage from './Pages/ToolDetailPage';
import AuthPage from './Pages/AuthPage';
import MyListingsPage from './Pages/MyListingsPage';
import CartPage from './Pages/CartPage';
import CheckoutPage from './Pages/CheckoutPage';
import OrderConfirmationPage from './Pages/OrderConfirmationPage';
import ToolListingFormPage from './Pages/ToolListingFormPage';
import AboutPage from './Pages/AboutPage';
import HelpPage from './Pages/HelpPage';
import CategoriesPage from './Pages/CategoriesPage';

// Component imports
import Header from './components/Header';
import Footer from './components/Footer';

// Styles
import './styles/design-system.css';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <Router>
          <div className="App min-h-screen flex flex-col bg-stone-50">
            <Header />
            
            <main className="flex-grow">
              <Routes>
                {/* Landing Page (Home) */}
                <Route path="/" element={<LandingPage />} />
                
                {/* Marketplace */}
                <Route path="/marketplace" element={<MarketplacePage />} />
                <Route path="/browse" element={<MarketplacePage />} />
                
                {/* Tool Routes */}
                <Route path="/tools/:id" element={<ToolDetailPage />} />
                <Route path="/tools/new" element={<ToolListingFormPage />} />
                <Route path="/tools/edit/:id" element={<ToolListingFormPage />} />
                
                {/* User Routes */}
                <Route path="/my-listings" element={<MyListingsPage />} />
                <Route path="/login" element={<AuthPage />} />
                
                {/* Cart Routes */}
                <Route path="/cart" element={<CartPage />} />
                <Route path="/checkout" element={<CheckoutPage />} />
                <Route path="/orders/:id" element={<OrderConfirmationPage />} />
                
                {/* About, Help, and Categories */}
                <Route path="/about" element={<AboutPage />} />
                <Route path="/help" element={<HelpPage />} />
                <Route path="/categories" element={<CategoriesPage />} />
                
                {/* Demo Auth Page */}
                <Route path="/demo" element={<AuthPage />} />
              </Routes>
            </main>
            
            <Footer />
          </div>
        </Router>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;