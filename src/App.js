// src/App.js - Firebase Implementation
import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import * as Sentry from '@sentry/react';
import { AuthProvider, CartProvider } from './firebase';
import { SellerProvider } from './firebase/hooks/useSeller';
import { useAuth } from './firebase/hooks/useAuth';
import { NotificationProvider } from './context/NotificationContext';
import { fixSellerStatus } from './utils/fixSellerStatus';
import EnvironmentDisplay from './components/EnvironmentDisplay';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from "@vercel/speed-insights/react";

// Page imports
import LandingPage from './Pages/LandingPage';
import LandingPageNew from './Pages/LandingPageNew';
import WaitlistLandingPage from './Pages/WaitlistLandingPage';
import AggregatorHomePage from './Pages/aggregator/AggregatorHomePage';
import AlertsPage from './Pages/aggregator/AlertsPage';
import FoundingSellersPage from './Pages/FoundingSellersPage';
import MarketplacePage from './Pages/MarketplacePage';
import ToolDetailPage from './Pages/ToolDetailPage';
import AuthPage from './Pages/AuthPage';
import MyListingsPage from './Pages/MyListingsPage';
import CartPage from './Pages/CartPage';
import CheckoutPage from './Pages/CheckoutPage';
import OrderConfirmationPage from './Pages/OrderConfirmationPage';
import ToolListingFormPage from './Pages/ToolListingFormPage';
import ToolScanPage from './Pages/ToolScanPage';
import FAQPage from './Pages/FAQPage';
import HelpPage from './Pages/HelpPage';
import CategoriesPage from './Pages/CategoriesPage';
import TermsPageAggregator from './Pages/TermsPageAggregator';
import PrivacyPageAggregator from './Pages/PrivacyPageAggregator';
import WishlistPage from './Pages/WishlistPage';
import SettingsPage from './Pages/SettingsPage';
import OrdersPage from './Pages/OrdersPage';
import OrderDetailPage from './Pages/OrderDetailPage';
import MessagesPage from './Pages/MessagesPage';
import NotFoundPage from './Pages/NotFoundPage';

// Seller page imports
import SellerSignupPage from './components/SellerSignupPage';
import SellerOnboardingPage from './components/SellerOnboardingPage';
import SellerDashboardPage from './components/SellerDashboardPage';
import SellerLandingPage from './components/SellerLandingPage';
import SellerOnboardAndListPage from './components/SellerOnboardAndListPage';
import CreatePendingListingPage from './components/CreatePendingListingPage';

// Component imports
import Header from './components/Header';
import Footer from './components/Footer';
import ScrollToTop from './components/ScrollToTop';
// Note: TestNotificationButton, UserIdDisplay, TestOrderButton, AuthModalExample removed

// Feature flags
import { MARKETPLACE_BETA, AGGREGATOR_MODE } from './utils/featureFlags';

// Styles
import './styles/design-system.css';
import './styles/auth.css';
import './App.css';

// Component to fix seller status when user is authenticated
function SellerStatusFix() {
  const { user } = useAuth();

  useEffect(() => {
    if (user?.uid) {
      fixSellerStatus(user.uid)
        .catch(error => {
          console.error('Error fixing seller status:', error);
        });
    }
  }, [user?.uid]);

  return null;
}

// Route guard — redirects public-mode users away from marketplace routes.
// In aggregator mode, only signed-in users can reach the marketplace surface
// (preserves dev/testing access). In pre-pivot public mode, the old gate still
// applies. Signed-in users always pass through regardless of flag state.
//
// The `loading` check matters: Firebase's onAuthStateChanged is async, so
// `user` is null for the first render tick after a hard refresh even for
// signed-in users. Without this guard, MarketplaceRoute redirects before
// auth rehydrates, then the user never sees the page they asked for.
function MarketplaceRoute({ element }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (AGGREGATOR_MODE && !user) {
    return <Navigate to="/?gated=1" replace />;
  }
  if (!MARKETPLACE_BETA && !user) {
    return <Navigate to="/?gated=1" replace />;
  }
  return element;
}

// Inner layout component that has access to useLocation
function AppLayout() {
  const location = useLocation();
  const { user } = useAuth();
  const isWaitlistPage = location.pathname === '/' && !MARKETPLACE_BETA && !AGGREGATOR_MODE;
  const isAggregatorHome = location.pathname === '/' && AGGREGATOR_MODE;
  const isAggregatorAlerts = location.pathname === '/alerts' && AGGREGATOR_MODE;
  // Campaign landing pages: no site chrome (Header/Footer) — focused conversion funnels.
  // AggregatorHomePage and AlertsPage ship their own editorial header + dark-teal footer.
  // Editorial content pages (About/FAQ/Contact) also ship their own chrome
  // per the post-pivot design handoff — see src/components/siteChrome/.
  const contentPagePaths = ['/faq', '/privacy', '/terms'];
  const isContentPage = contentPagePaths.includes(location.pathname);
  const isChromelessPage =
    location.pathname === '/founding-sellers' || isAggregatorHome || isAggregatorAlerts || isContentPage;

  // Public mode: aggregator is on OR marketplace not yet launched, AND user not signed in.
  // Header/Footer adapt their CTAs when publicMode is true.
  const isPublicMode = (AGGREGATOR_MODE || !MARKETPLACE_BETA) && !user;

  return (
    <div className="App min-h-screen flex flex-col bg-stone-50">
      <ScrollToTop />
      <SellerStatusFix />
      {!isWaitlistPage && !isChromelessPage && <Header publicMode={isPublicMode} />}

      <main className={!isWaitlistPage && !isChromelessPage ? 'flex-grow' : undefined}>
        <Routes>
          {/* Home: design-spec aggregator homepage in aggregator mode,
              legacy marketplace landing otherwise. */}
          <Route
            path="/"
            element={
              AGGREGATOR_MODE
                ? <AggregatorHomePage />
                : (MARKETPLACE_BETA ? <LandingPageNew /> : <WaitlistLandingPage />)
            }
          />

          {/* App Home (previous landing page, preserved) */}
          <Route path="/app" element={<MarketplaceRoute element={<LandingPageNew />} />} />
          <Route path="/old-home" element={<MarketplaceRoute element={<LandingPage />} />} />

          {/* Marketplace — gated */}
          <Route path="/marketplace" element={<MarketplaceRoute element={<MarketplacePage />} />} />
          <Route path="/browse" element={<MarketplaceRoute element={<MarketplacePage />} />} />

          {/* ToolScan — always public */}
          <Route path="/scan" element={<ToolScanPage />} />

          {/* Aggregator: saved-search management (/alerts). Gated to signed-in
              users at the page level — anonymous visitors see a sign-in CTA. */}
          <Route path="/alerts" element={<AlertsPage />} />

          {/* Founding Sellers campaign landing — live seller funnel.
              Gated off when the aggregator is on; page file preserved for future marketplace relaunch. */}
          <Route
            path="/founding-sellers"
            element={AGGREGATOR_MODE ? <Navigate to="/?gated=1" replace /> : <FoundingSellersPage />}
          />

          {/* Tool Routes — gated */}
          <Route path="/tools/:id" element={<MarketplaceRoute element={<ToolDetailPage />} />} />
          <Route path="/tools/new" element={<MarketplaceRoute element={<ToolListingFormPage />} />} />
          <Route path="/tools/edit/:id" element={<MarketplaceRoute element={<ToolListingFormPage />} />} />

          {/* Seller Tool Routes — gated */}
          <Route path="/seller/tools/new" element={<MarketplaceRoute element={<ToolListingFormPage />} />} />

          {/* User Routes — gated except auth */}
          <Route path="/my-listings" element={<MarketplaceRoute element={<MyListingsPage />} />} />
          <Route path="/login" element={<AuthPage />} />
          <Route path="/wishlist" element={<MarketplaceRoute element={<WishlistPage />} />} />
          <Route path="/settings" element={<MarketplaceRoute element={<SettingsPage />} />} />
          <Route path="/messages" element={<MarketplaceRoute element={<MessagesPage />} />} />
          <Route path="/messages/conversation/:conversationId" element={<MarketplaceRoute element={<MessagesPage />} />} />

          {/* Cart Routes — gated */}
          <Route path="/cart" element={<MarketplaceRoute element={<CartPage />} />} />
          <Route path="/checkout" element={<MarketplaceRoute element={<CheckoutPage />} />} />

          {/* Order Routes — gated */}
          <Route path="/orders" element={<MarketplaceRoute element={<OrdersPage />} />} />
          <Route path="/orders/:id" element={<MarketplaceRoute element={<OrderDetailPage />} />} />
          <Route path="/order-confirmation/:id" element={<MarketplaceRoute element={<OrderConfirmationPage />} />} />
          <Route path="/order-complete" element={<MarketplaceRoute element={<OrderConfirmationPage />} />} />

          {/* Seller Routes — gated */}
          <Route path="/sell" element={<MarketplaceRoute element={<SellerLandingPage />} />} />
          <Route path="/seller/signup" element={<MarketplaceRoute element={<SellerSignupPage />} />} />
          <Route path="/seller/onboarding" element={<MarketplaceRoute element={<SellerOnboardingPage />} />} />
          <Route path="/seller/onboarding/refresh" element={<MarketplaceRoute element={<SellerOnboardingPage />} />} />
          <Route path="/seller/onboarding/complete" element={<MarketplaceRoute element={<SellerOnboardingPage />} />} />
          <Route path="/seller/dashboard" element={<MarketplaceRoute element={<SellerDashboardPage />} />} />
          <Route path="/seller/onboard-and-list" element={<MarketplaceRoute element={<SellerOnboardAndListPage />} />} />
          <Route path="/seller/create-pending-listing" element={<MarketplaceRoute element={<CreatePendingListingPage />} />} />

          {/* Always public: About, Help, Legal, Categories */}
          <Route path="/faq" element={<FAQPage />} />
          {/* /about and /contact consolidated into /faq (RAQ). Keep /help
              pointing at legacy HelpPage so old deep-links don't 404. */}
          <Route path="/about" element={<Navigate to="/faq" replace />} />
          <Route path="/contact" element={<Navigate to="/faq" replace />} />
          <Route path="/help" element={<HelpPage />} />
          <Route path="/categories" element={<CategoriesPage />} />
          <Route path="/terms" element={<TermsPageAggregator />} />
          <Route path="/privacy" element={<PrivacyPageAggregator />} />

          {/* 404 Not Found */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>

      {!isWaitlistPage && !isChromelessPage && <Footer publicMode={isPublicMode} />}
      <EnvironmentDisplay />
      <Analytics />
      <SpeedInsights />
    </div>
  );
}

function SentryFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 p-8">
      <div className="text-center max-w-md">
        <h1 className="text-2xl font-display text-spruce mb-4">Something went wrong</h1>
        <p className="text-dark-teal/70 mb-6">
          We've been notified and are looking into it. Please try refreshing the page.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-2 bg-honey text-dark-teal font-medium rounded-lg hover:bg-honey/90 transition-colors"
        >
          Refresh Page
        </button>
      </div>
    </div>
  );
}

function App() {
  return (
    <Sentry.ErrorBoundary fallback={SentryFallback}>
      <AuthProvider>
        <CartProvider>
          <SellerProvider>
            <NotificationProvider>
              <Router>
                <AppLayout />
              </Router>
            </NotificationProvider>
          </SellerProvider>
        </CartProvider>
      </AuthProvider>
    </Sentry.ErrorBoundary>
  );
}

export default App;
