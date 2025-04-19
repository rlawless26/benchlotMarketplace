// src/App.js - Firebase Implementation
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider, CartProvider } from './firebase';
import { SellerProvider } from './firebase/hooks/useSeller';
import { NotificationProvider } from './context/NotificationContext';
import EnvironmentDisplay from './components/EnvironmentDisplay';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from "@vercel/speed-insights/react";

// Page imports
import LandingPage from './Pages/LandingPage';
import LandingPageNew from './Pages/LandingPageNew';
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
import WishlistPage from './Pages/WishlistPage';
import SettingsPage from './Pages/SettingsPage';
import OrdersPage from './Pages/OrdersPage';
import OrderDetailPage from './Pages/OrderDetailPage';
import MessagesPage from './Pages/MessagesPage';

// Seller page imports
import SellerSignupPage from './components/SellerSignupPage';
import SellerOnboardingPage from './components/SellerOnboardingPage';
import SellerDashboardPage from './components/SellerDashboardPage';
import SellerLandingPage from './components/SellerLandingPage';

// Component imports
import Header from './components/Header';
import Footer from './components/Footer';
import TestOrderButton from './components/TestOrderButton';
// Note: TestNotificationButton and UserIdDisplay removed

// Styles
import './styles/design-system.css';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <SellerProvider>
          <NotificationProvider>
            <Router>
              <div className="App min-h-screen flex flex-col bg-stone-50">
                <Header />
              
              <main className="flex-grow">
                <Routes>
                  {/* Landing Page (Home) */}
                  <Route path="/" element={<LandingPageNew />} />
                  <Route path="/old-home" element={<LandingPage />} />
                  
                  {/* Marketplace */}
                  <Route path="/marketplace" element={<MarketplacePage />} />
                  <Route path="/browse" element={<MarketplacePage />} />
                  
                  {/* Tool Routes */}
                  <Route path="/tools/:id" element={<ToolDetailPage />} />
                  <Route path="/tools/new" element={<ToolListingFormPage />} />
                  <Route path="/tools/edit/:id" element={<ToolListingFormPage />} />
                  
                  {/* Seller Tool Routes */}
                  <Route path="/seller/tools/new" element={<ToolListingFormPage />} />
                  
                  {/* User Routes */}
                  <Route path="/my-listings" element={<MyListingsPage />} />
                  <Route path="/login" element={<AuthPage />} />
                  <Route path="/wishlist" element={<WishlistPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="/messages" element={<MessagesPage />} />
                  <Route path="/messages/conversation/:conversationId" element={<MessagesPage />} />
                  
                  {/* Cart Routes */}
                  <Route path="/cart" element={<CartPage />} />
                  <Route path="/checkout" element={<CheckoutPage />} />
                  
                  {/* Order Routes */}
                  <Route path="/orders" element={<OrdersPage />} />
                  <Route path="/orders/:id" element={<OrderDetailPage />} />
                  <Route path="/order-confirmation/:id" element={<OrderConfirmationPage />} />
                  <Route path="/order-complete" element={<OrderConfirmationPage />} />
                  
                  {/* Seller Routes */}
                  <Route path="/sell" element={<SellerLandingPage />} />
                  <Route path="/seller/signup" element={<SellerSignupPage />} />
                  <Route path="/seller/onboarding" element={<SellerOnboardingPage />} />
                  <Route path="/seller/onboarding/refresh" element={<SellerOnboardingPage />} />
                  <Route path="/seller/onboarding/complete" element={<SellerOnboardingPage />} />
                  <Route path="/seller/dashboard" element={<SellerDashboardPage />} />
                  
                  {/* About, Help, and Categories */}
                  <Route path="/about" element={<AboutPage />} />
                  <Route path="/help" element={<HelpPage />} />
                  <Route path="/categories" element={<CategoriesPage />} />
                  
                  {/* Demo Auth Page */}
                  <Route path="/demo" element={<AuthPage />} />
                </Routes>
              </main>
              
              <Footer />
              <EnvironmentDisplay />
              {process.env.NODE_ENV === 'development' && <TestOrderButton />}
              <Analytics />
              <SpeedInsights />
            </div>
            </Router>
          </NotificationProvider>
        </SellerProvider>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;