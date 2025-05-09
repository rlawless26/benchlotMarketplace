/**
 * SettingsPage Component
 * Provides a complete user settings interface with Firebase integration
 */
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  User, 
  Lock, 
  MapPin, 
  CreditCard, 
  Bell, 
  ChevronRight, 
  Loader
} from 'lucide-react';
import { openAuthModal } from '../utils/featureFlags';
import { useAuth } from '../firebase/hooks/useAuth';

// Profile Tabs
const ProfileSettings = React.lazy(() => import('../components/settings/ProfileSettings'));
const PasswordSettings = React.lazy(() => import('../components/settings/PasswordSettings'));
const AddressSettings = React.lazy(() => import('../components/settings/AddressSettings'));
const PaymentSettings = React.lazy(() => import('../components/settings/PaymentSettings'));
const NotificationSettings = React.lazy(() => import('../components/settings/NotificationSettings'));
const SellerOnboarding = React.lazy(() => import('../components/settings/SellerOnboarding'));

const SettingsPage = () => {
  const { user, loading, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Parse tab from URL query parameters
  const queryParams = new URLSearchParams(location.search);
  const tabFromQuery = queryParams.get('tab');
  
  // Set initial active tab based on URL or default to 'profile'
  const [activeTab, setActiveTab] = useState(
    tabFromQuery && ['profile', 'password', 'address', 'payment', 'notifications'].includes(tabFromQuery)
      ? tabFromQuery
      : 'profile'
  );
  
  // Check if user is a seller
  const isSeller = user?.isSeller || user?.profile?.isSeller || false;
  
  // Update URL when tab changes
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
  
  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader className="h-10 w-10 text-benchlot-primary animate-spin" />
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
            active ? 'bg-benchlot-accent-light text-benchlot-primary' : 'hover:bg-stone-50 text-stone-700'
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
        <h1 className="text-3xl font-serif font-medium text-stone-800 mb-6">Account Settings</h1>
        
        {/* Settings grid layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Left sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md overflow-hidden sticky top-24">
              <div className="p-4 border-b">
                <h2 className="font-medium text-stone-800">Settings</h2>
              </div>
              
              <nav className="p-2">
                <ul className="space-y-1">
                  <TabButton 
                    id="profile" 
                    icon={User} 
                    label="Profile" 
                    active={activeTab === 'profile'} 
                    onClick={handleTabChange} 
                  />
                  
                  <TabButton 
                    id="password" 
                    icon={Lock} 
                    label="Password" 
                    active={activeTab === 'password'} 
                    onClick={handleTabChange} 
                  />
                  
                  <TabButton 
                    id="address" 
                    icon={MapPin} 
                    label="Address" 
                    active={activeTab === 'address'} 
                    onClick={handleTabChange} 
                  />
                  
                  <TabButton 
                    id="payment" 
                    icon={CreditCard} 
                    label="Payment Methods" 
                    active={activeTab === 'payment'} 
                    onClick={handleTabChange} 
                  />
                  
                  <TabButton 
                    id="notifications" 
                    icon={Bell} 
                    label="Notifications" 
                    active={activeTab === 'notifications'} 
                    onClick={handleTabChange} 
                  />
                  
                </ul>
              </nav>
            </div>
          </div>
          
          {/* Main content area */}
          <div className="lg:col-span-3">
            <React.Suspense 
              fallback={
                <div className="bg-white rounded-lg shadow-md p-8 flex justify-center">
                  <Loader className="h-8 w-8 text-benchlot-primary animate-spin" />
                </div>
              }
            >
              {activeTab === 'profile' && <ProfileSettings user={user} />}
              {activeTab === 'password' && <PasswordSettings />}
              {activeTab === 'address' && <AddressSettings user={user} />}
              {activeTab === 'payment' && <PaymentSettings user={user} />}
              {activeTab === 'notifications' && <NotificationSettings user={user} />}
            </React.Suspense>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SettingsPage;