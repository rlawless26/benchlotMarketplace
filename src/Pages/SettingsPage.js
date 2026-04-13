/**
 * SettingsPage Component
 *
 * Unified settings page for all users. Non-sellers see 5 tabs (Profile,
 * Password, Address, Payment Methods, Notifications). Sellers see 7 — the
 * same 5 plus Business Details and Payouts in a SELLING section.
 */
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  User,
  Lock,
  MapPin,
  CreditCard,
  Bell,
  Store,
  DollarSign,
  ChevronRight,
  Loader
} from 'lucide-react';
import { openAuthModal } from '../utils/featureFlags';
import { useAuth } from '../firebase/hooks/useAuth';

// Lazy-loaded tab components
const ProfileSettings = React.lazy(() => import('../components/settings/ProfileSettings'));
const PasswordSettings = React.lazy(() => import('../components/settings/PasswordSettings'));
const AddressSettings = React.lazy(() => import('../components/settings/AddressSettings'));
const PaymentSettings = React.lazy(() => import('../components/settings/PaymentSettings'));
const NotificationSettings = React.lazy(() => import('../components/settings/NotificationSettings'));
const BusinessDetailsSettings = React.lazy(() => import('../components/settings/BusinessDetailsSettings'));
const PayoutsSettings = React.lazy(() => import('../components/settings/PayoutsSettings'));

const ALL_TABS = ['profile', 'password', 'address', 'payment', 'notifications', 'business', 'payouts'];

const SettingsPage = () => {
  const { user, loading, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isSeller = !!(
    user?.isSeller === true ||
    user?.seller?.isSeller === true ||
    user?.profile?.isSeller === true
  );

  // Parse tab from URL query parameters
  const queryParams = new URLSearchParams(location.search);
  const tabFromQuery = queryParams.get('tab');

  const [activeTab, setActiveTab] = useState(
    tabFromQuery && ALL_TABS.includes(tabFromQuery) ? tabFromQuery : 'profile'
  );

  // If a non-seller lands on a seller tab (e.g., stale bookmark), redirect to profile
  useEffect(() => {
    if (!loading && !isSeller && (activeTab === 'business' || activeTab === 'payouts')) {
      setActiveTab('profile');
      navigate('/settings?tab=profile', { replace: true });
    }
  }, [isSeller, activeTab, loading, navigate]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    navigate(`/settings?tab=${tab}`, { replace: true });
  };

  // Open auth modal if not authenticated
  useEffect(() => {
    if (!loading && !isAuthenticated()) {
      openAuthModal('signin', location.pathname + location.search);
    }
  }, [isAuthenticated, loading, location]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader className="h-10 w-10 text-spruce animate-spin" />
      </div>
    );
  }

  // Sidebar Tab Button Component
  const TabButton = ({ id, icon, label, active, onClick }) => {
    const Icon = icon;
    return (
      <li>
        <button
          className={`w-full text-left px-3 py-2 rounded-md flex items-center ${
            active ? 'bg-bone-dark text-spruce' : 'hover:bg-stone-50 text-stone-700'
          }`}
          onClick={() => onClick(id)}
        >
          <Icon className="h-4 w-4 mr-3" />
          {label}
          <ChevronRight className={`h-4 w-4 ml-auto ${active ? 'opacity-100' : 'opacity-0'}`} />
        </button>
      </li>
    );
  };

  return (
    <div className="bg-stone-50 min-h-screen">
      <main className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-display font-medium text-stone-800 mb-6">Settings</h1>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-bone-light rounded-lg shadow-md overflow-hidden sticky top-24">
              <nav className="p-2">
                <ul className="space-y-1">
                  <TabButton id="profile" icon={User} label="Profile" active={activeTab === 'profile'} onClick={handleTabChange} />
                  <TabButton id="password" icon={Lock} label="Password" active={activeTab === 'password'} onClick={handleTabChange} />
                  <TabButton id="address" icon={MapPin} label="Address" active={activeTab === 'address'} onClick={handleTabChange} />
                  <TabButton id="payment" icon={CreditCard} label="Payment Methods" active={activeTab === 'payment'} onClick={handleTabChange} />
                  <TabButton id="notifications" icon={Bell} label="Notifications" active={activeTab === 'notifications'} onClick={handleTabChange} />

                  {/* Seller tabs — only visible when isSeller */}
                  {isSeller && (
                    <>
                      <li className="pt-3 pb-1 px-3">
                        <span className="text-xs font-body font-medium text-stone-400 uppercase tracking-wide">
                          Selling
                        </span>
                      </li>
                      <TabButton id="business" icon={Store} label="Business Details" active={activeTab === 'business'} onClick={handleTabChange} />
                      <TabButton id="payouts" icon={DollarSign} label="Payouts" active={activeTab === 'payouts'} onClick={handleTabChange} />
                    </>
                  )}
                </ul>
              </nav>
            </div>
          </div>

          {/* Main content */}
          <div className="lg:col-span-3">
            <React.Suspense
              fallback={
                <div className="bg-bone-light rounded-lg shadow-md p-8 flex justify-center">
                  <Loader className="h-8 w-8 text-spruce animate-spin" />
                </div>
              }
            >
              {activeTab === 'profile' && <ProfileSettings user={user} />}
              {activeTab === 'password' && <PasswordSettings />}
              {activeTab === 'address' && <AddressSettings user={user} />}
              {activeTab === 'payment' && <PaymentSettings user={user} />}
              {activeTab === 'notifications' && <NotificationSettings user={user} />}
              {activeTab === 'business' && isSeller && <BusinessDetailsSettings user={user} />}
              {activeTab === 'payouts' && isSeller && <PayoutsSettings user={user} />}
            </React.Suspense>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SettingsPage;
