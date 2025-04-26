import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../firebase/hooks/useAuth';
import { getConnectAccountStatus, getConnectDashboardLink } from '../utils/stripeService';
import NewSellerWelcome from './NewSellerWelcome';
import { openAuthModal } from '../utils/featureFlags';
import { Store, Check, Loader, AlertCircle, Briefcase, FileText, Truck, ExternalLink, DollarSign, Package } from 'lucide-react';
import { updateSellerSettings } from '../firebase/models/userModel';
import MyListings from './MyListings';

/**
 * Seller Dashboard Page
 * Central hub for seller activities including:
 * - Viewing account status
 * - Managing listings
 * - Accessing Stripe dashboard
 * - Viewing sales analytics
 */
const SellerDashboardPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);
  const [accountStatus, setAccountStatus] = useState(null);
  const [error, setError] = useState(null);
  const [listings, setListings] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [showWelcome, setShowWelcome] = useState(false);
  const [activeMainTab, setActiveMainTab] = useState('dashboard');
  const [activeSettingsTab, setActiveSettingsTab] = useState('business');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  
  // State for seller data
  const [sellerData, setSellerData] = useState({
    // Business Details
    businessName: '',
    businessType: 'individual',
    businessDescription: '',
    contactEmail: '',
    contactPhone: '',
    preferredContactMethod: 'email',
    
    // Store Policies
    policies: {
      returns: {
        acceptsReturns: true,
        returnPeriod: 14,
        conditions: ''
      },
      shipping: {
        offersFreeShipping: false,
        freeShippingThreshold: 100,
        shippingMethods: ['standard', 'express'],
        offerLocalPickup: true,
        defaultShippingPrice: 15,
      }
    },
    
    // Financial Settings
    financial: {
      currency: 'USD',
      payoutMethod: 'bank',
      payoutFrequency: 'weekly',
      accountLinked: false
    },
    
    // Stripe Connect Status
    stripeConnectComplete: false,
    stripeAccountId: ''
  });

  // State for offers
  const [offers, setOffers] = useState([]);
  const [totalSales, setTotalSales] = useState(0);
  const [ordersCount, setOrdersCount] = useState(0);
  
  // Fetch seller status and data on mount
  useEffect(() => {
    const loadSellerData = async () => {
      try {
        // Check if still loading authentication state
        if (loading && !user) {
          return;
        }
        
        if (!user) {
          openAuthModal('signin', '/seller/dashboard');
          return;
        }
        
        // Check if user is a seller - check all possible locations using new seller object structure
        const userIsSeller = user.seller?.isSeller === true || 
                           user.isSeller === true || 
                           user.seller?.stripeStatus === 'active' ||
                           (user.seller?.hasBankAccount === true && user.seller?.verified === true);
        
        console.log('SellerDashboardPage - Checking if user is a seller:', {
          userIsSeller,
          sellerIsSeller: user.seller?.isSeller,
          topLevelIsSeller: user.isSeller,
          sellerStripeStatus: user.seller?.stripeStatus,
          sellerHasBankAccount: user.seller?.hasBankAccount,
          sellerVerified: user.seller?.verified
        });
                           
        if (!userIsSeller) {
          console.log('User is not a seller, redirecting to seller signup');
          navigate('/seller/signup');
          return;
        }
        
        // Try to get account status from Stripe API but handle errors gracefully
        try {
          const status = await getConnectAccountStatus(user.uid);
          
          if (status) {
            setAccountStatus(status);
            
            // Check if the account is in a restricted state 
            // We'll be more forgiving to allow access to the dashboard
            const onlyNonCriticalRequirements = status.status === 'restricted' && 
              status.requirements?.currently_due?.every(req => 
                req === 'individual.last_name' || req === 'individual.first_name' || req === 'business_profile.url'
              );
              
            const isRestrictedButComplete = status.status === 'restricted' && 
              (!status.requirements || !status.requirements.currently_due || status.requirements.currently_due.length === 0);
                
            console.log('SellerDashboardPage - Account status check:', {
              detailsSubmitted: status.detailsSubmitted,
              isRestrictedButComplete,
              onlyNonCriticalRequirements,
              requirements: status.requirements?.currently_due,
              hasBankAccount: !!user.seller?.hasBankAccount,
              verified: !!user.seller?.verified,
              topLevelVerified: !!user.verified,
              topLevelBankAccount: !!user.hasBankAccount
            });
              
            // Check both new and old data locations for bank account verification
            const hasVerifiedBankAccount = 
              (user.seller?.hasBankAccount === true && user.seller?.verified === true) ||
              (user.hasBankAccount === true && user.verified === true);
              
            // Only redirect to onboarding if we're in a truly problematic state
            // If we only have non-critical requirements or have verified bank details, allow dashboard access
            if (!status.detailsSubmitted && 
                !isRestrictedButComplete && 
                !onlyNonCriticalRequirements && 
                !hasVerifiedBankAccount && 
                !location.search.includes('newSeller=true')) {
              
              console.log('Redirecting to onboarding - account not ready:', { 
                detailsSubmitted: status.detailsSubmitted,
                isRestrictedButComplete,
                onlyNonCriticalRequirements,
                hasVerifiedBankAccount
              });
              
              navigate('/seller/onboarding');
              return;
            }
          } else {
            console.log('No account status returned from Stripe, checking user record');
            // Handle null status by checking user record
            // Check both new and old data locations for bank account verification
            const hasVerifiedBankAccount = 
              (user.seller?.hasBankAccount === true && user.seller?.verified === true) ||
              (user.hasBankAccount === true && user.verified === true);
              
            console.log('Checking for verified bank account with null status:', {
              sellerHasBankAccount: !!user.seller?.hasBankAccount,
              sellerVerified: !!user.seller?.verified,
              topLevelHasBankAccount: !!user.hasBankAccount,
              topLevelVerified: !!user.verified,
              hasVerifiedBankAccount
            });
              
            if (hasVerifiedBankAccount) {
              console.log('User has bank account verified in Firestore, creating default account status');
              setAccountStatus({
                accountId: user.seller?.stripeAccountId || user.stripeAccountId || 'direct_account',
                status: 'active',
                detailsSubmitted: true,
                payoutsEnabled: true
              });
            } else if (!location.search.includes('newSeller=true')) {
              // If no direct bank details and no newSeller param, redirect to onboarding
              navigate('/seller/onboarding');
              return;
            }
          }
        } catch (statusError) {
          console.error('Error fetching Stripe account status:', statusError);
          
          // Check user record directly for bank account status - checking both new and old data locations
          // If user has added bank account details directly in app, consider them verified
          const hasVerifiedBankAccount = 
            (user.seller?.hasBankAccount === true && user.seller?.verified === true) ||
            (user.hasBankAccount === true && user.verified === true);
            
          console.log('Checking for verified bank account after status error:', {
            sellerHasBankAccount: !!user.seller?.hasBankAccount,
            sellerVerified: !!user.seller?.verified,
            topLevelHasBankAccount: !!user.hasBankAccount,
            topLevelVerified: !!user.verified,
            hasVerifiedBankAccount
          });
            
          if (hasVerifiedBankAccount) {
            console.log('User has bank account verified in Firestore, overriding Stripe status check');
            setAccountStatus({
              accountId: user.seller?.stripeAccountId || user.stripeAccountId || 'direct_account',
              status: 'active',
              detailsSubmitted: true,
              payoutsEnabled: true
            });
          } else if (!location.search.includes('newSeller=true')) {
            // If no direct bank details and no newSeller param, redirect to onboarding
            navigate('/seller/onboarding');
            return;
          }
        }
        
        // Check if this is a new seller (from the query parameter)
        const isNewSeller = new URLSearchParams(location.search).get('newSeller') === 'true';
        setShowWelcome(isNewSeller);
        
        // If it's a new seller arriving, clean the URL for better sharing and bookmarking
        if (isNewSeller) {
          window.history.replaceState({}, document.title, '/seller/dashboard');
        }
        
        // Load seller settings data
        if (user && (user.profile?.seller || user.seller)) {
          const sellerProfile = user.profile?.seller || user.seller || {};
          
          setSellerData(prevData => ({
            ...prevData,
            businessName: sellerProfile.businessName || prevData.businessName,
            businessType: sellerProfile.businessType || prevData.businessType,
            businessDescription: sellerProfile.businessDescription || prevData.businessDescription,
            contactEmail: sellerProfile.contactEmail || prevData.contactEmail,
            contactPhone: sellerProfile.contactPhone || prevData.contactPhone,
            preferredContactMethod: sellerProfile.preferredContactMethod || prevData.preferredContactMethod,
            
            policies: {
              returns: {
                ...prevData.policies.returns,
                ...(sellerProfile.policies?.returns || {}),
              },
              shipping: {
                ...prevData.policies.shipping,
                ...(sellerProfile.policies?.shipping || {}),
              },
            },
            
            financial: {
              ...prevData.financial,
              ...(sellerProfile.financial || {}),
            },
            
            stripeConnectComplete: sellerProfile.stripeConnectComplete || !!sellerProfile.stripeAccountId || false,
            stripeAccountId: sellerProfile.stripeAccountId || '',
          }));
        }
        
        // Fetch seller's listings from Firebase
        // For now, we'll use mock data
        setListings([
          {
            id: 'listing1',
            name: 'DeWalt Power Drill',
            price: 149.99,
            status: 'active',
            images: ['https://via.placeholder.com/150']
          },
          {
            id: 'listing2',
            name: 'Makita Circular Saw',
            price: 219.99,
            status: 'active',
            images: ['https://via.placeholder.com/150']
          }
        ]);
        
        // Fetch recent offers
        // For now, we'll use mock data
        setOffers([
          {
            id: 'offer1',
            toolId: 'listing1',
            toolTitle: 'DeWalt Power Drill',
            buyerId: 'buyer1',
            buyerName: 'John Doe',
            buyerPhoto: null,
            originalPrice: 149.99,
            currentPrice: 130.00,
            status: 'pending',
            createdAt: { seconds: Date.now() / 1000 - 60 * 60 }
          },
          {
            id: 'offer2',
            toolId: 'listing2',
            toolTitle: 'Makita Circular Saw',
            buyerId: 'buyer2',
            buyerName: 'Jane Smith',
            buyerPhoto: null,
            originalPrice: 219.99,
            currentPrice: 195.00,
            status: 'accepted',
            createdAt: { seconds: Date.now() / 1000 - 2 * 60 * 60 }
          },
          {
            id: 'offer3',
            toolId: 'listing1',
            toolTitle: 'DeWalt Power Drill',
            buyerId: 'buyer3',
            buyerName: 'Bob Johnson',
            buyerPhoto: null,
            originalPrice: 149.99,
            currentPrice: 120.00,
            status: 'countered',
            createdAt: { seconds: Date.now() / 1000 - 5 * 60 * 60 }
          }
        ]);

        // Fetch orders count and total sales
        setOrdersCount(5);
        setTotalSales(1256.78);
        
        setLoading(false);
      } catch (err) {
        console.error('Error loading seller data:', err);
        setError(err.message || 'Failed to load seller dashboard data.');
        setLoading(false);
      }
    };
    
    loadSellerData();
  }, [user, navigate, loading, location]);
  
  // Handle accessing the Stripe dashboard
  // Handle text field changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Handle nested fields
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setSellerData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setSellerData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };
  
  // Handle toggle change
  const handleToggleChange = (field) => {
    // Handle nested fields
    if (field.includes('.')) {
      const segments = field.split('.');
      
      if (segments.length === 2) {
        const [parent, child] = segments;
        setSellerData(prev => ({
          ...prev,
          [parent]: {
            ...prev[parent],
            [child]: !prev[parent]?.[child]
          }
        }));
      } else if (segments.length === 3) {
        const [parent, child, grandchild] = segments;
        setSellerData(prev => ({
          ...prev,
          [parent]: {
            ...prev[parent],
            [child]: {
              ...prev[parent]?.[child],
              [grandchild]: !prev[parent]?.[child]?.[grandchild]
            }
          }
        }));
      }
    } else {
      setSellerData(prev => ({
        ...prev,
        [field]: !prev[field]
      }));
    }
  };
  
  // Handle nested numeric input changes
  const handleNestedNumberChange = (e) => {
    const { name, value } = e.target;
    const segments = name.split('.');
    
    if (segments.length === 2) {
      const [parent, child] = segments;
      setSellerData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: Number(value)
        }
      }));
    } else if (segments.length === 3) {
      const [parent, child, grandchild] = segments;
      setSellerData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: {
            ...prev[parent]?.[child],
            [grandchild]: Number(value)
          }
        }
      }));
    }
  };
  
  // Handle checkbox change for shipping methods
  const handleShippingMethodChange = (method) => {
    const currentMethods = sellerData.policies.shipping.shippingMethods || [];
    let updatedMethods;
    
    if (currentMethods.includes(method)) {
      updatedMethods = currentMethods.filter(m => m !== method);
    } else {
      updatedMethods = [...currentMethods, method];
    }
    
    setSellerData(prev => ({
      ...prev,
      policies: {
        ...prev.policies,
        shipping: {
          ...prev.policies.shipping,
          shippingMethods: updatedMethods
        }
      }
    }));
  };
  
  // Handle form submission
  const handleSaveSettings = async () => {
    setSaving(true);
    setError(null);
    
    try {
      await updateSellerSettings(user.uid, sellerData);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving seller settings:', err);
      setError(err.message || 'Failed to save seller settings');
    } finally {
      setSaving(false);
    }
  };
  
  const handleAccessStripeDashboard = async () => {
    try {
      if (!user) {
        throw new Error('User information is missing');
      }
      
      const stripeAccountId = user.seller?.stripeAccountId || user.stripeAccountId;
      
      if (!stripeAccountId) {
        throw new Error('No Stripe account associated with this seller account');
      }
      
      // Get a dashboard link
      const result = await getConnectDashboardLink(user.uid);
      
      if (!result.url) {
        throw new Error('No Stripe dashboard URL returned');
      }
      
      // Open the Stripe dashboard in a new tab
      window.open(result.url, '_blank');
      
    } catch (err) {
      console.error('Error accessing Stripe dashboard:', err);
      setError(err.message || 'Failed to access Stripe dashboard. Please try again.');
    }
  };

  // Toggle Switch component
  const ToggleSwitch = ({ id, checked, onChange, label, description }) => (
    <div className="flex items-start py-4">
      <div className="flex-shrink-0 mt-1">
        <button
          id={id}
          type="button"
          className={`relative inline-flex flex-shrink-0 h-6 transition-colors duration-200 ease-in-out border-2 border-transparent rounded-full cursor-pointer w-11 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-benchlot-primary ${
            checked ? 'bg-benchlot-primary' : 'bg-stone-200'
          }`}
          role="switch"
          aria-checked={checked}
          onClick={onChange}
        >
          <span 
            className={`inline-block w-5 h-5 transition duration-200 ease-in-out transform bg-white rounded-full shadow pointer-events-none ${
              checked ? 'translate-x-5' : 'translate-x-0'
            }`} 
          />
        </button>
      </div>
      <div className="ml-3">
        <label htmlFor={id} className="text-sm font-medium text-stone-800 cursor-pointer">{label}</label>
        {description && <p className="text-xs text-stone-500 mt-1">{description}</p>}
      </div>
    </div>
  );
  
  if (loading) {
    return (
      <div className="bg-gray-100 min-h-screen">
        <main className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-700"></div>
            <span className="ml-2 text-gray-600">Loading...</span>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="bg-gray-100 min-h-screen">
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left sidebar */}
          <div className="col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <div className="flex items-center space-x-4 mb-6">
                {user?.photoURL ? (
                  // Display user's profile image if available
                  <div className="h-16 w-16 rounded-full overflow-hidden border border-gray-200">
                    <img 
                      src={user.photoURL} 
                      alt="Profile" 
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23047857'%3E%3Cpath d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z'/%3E%3C/svg%3E`;
                      }}
                    />
                  </div>
                ) : (
                  // Fallback to initial if no profile image
                  <div className="h-16 w-16 rounded-full bg-benchlot-accent-light flex items-center justify-center">
                    <span className="text-xl font-bold text-benchlot-primary">
                      {user?.profile?.sellerName?.charAt(0) || user?.email?.charAt(0)?.toUpperCase() || 'S'}
                    </span>
                  </div>
                )}
                <div>
                  <h2 className="text-xl font-medium">{user?.profile?.sellerName || user?.displayName || 'Seller'}</h2>
                  <p className="text-gray-600 text-sm">{user?.profile?.location || 'Boston, MA'}</p>
                </div>
              </div>
              
              <div className="border-t border-gray-200 pt-4 mb-4">
                <h3 className="text-sm font-medium text-gray-500 mb-2">ACCOUNT STATUS</h3>
                <div className="flex items-center">
                  <div className={`h-3 w-3 rounded-full ${
                    accountStatus?.status === 'active' ? 'bg-green-500' : 
                    !accountStatus ? 'bg-gray-500' : 'bg-blue-500'
                  } mr-2`}></div>
                  <span className="font-medium">
                    {accountStatus?.status === 'active' ? 'Active' : 
                     !accountStatus ? 'Setting up...' : 'Processing...'}
                  </span>
                </div>
                
                {accountStatus && accountStatus.status !== 'active' && (
                  <div className="mt-2 text-sm text-blue-600 bg-blue-50 p-2 rounded">
                    <p>Your seller account is being activated. This usually takes a few minutes. Feel free to continue exploring your dashboard.</p>
                    <button 
                      onClick={() => window.location.reload()} 
                      className="mt-2 text-xs bg-blue-100 hover:bg-blue-200 text-blue-800 font-medium py-1 px-2 rounded"
                    >
                      Refresh Status
                    </button>
                  </div>
                )}
                
                {/* Stripe Dashboard access button removed since we're using controller.stripe_dashboard.type = 'none' */}
              </div>
              
              <div className="border-t border-gray-200 pt-4 mb-2">
                <h3 className="text-sm font-medium text-gray-500 mb-2">SELLER MENU</h3>
                <nav className="space-y-1">
                  <button 
                    onClick={() => setActiveMainTab('dashboard')}
                    className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                      activeMainTab === 'dashboard' ? 'bg-green-50 text-green-700' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                    Dashboard
                  </button>
                  <button 
                    onClick={() => setActiveMainTab('listings')}
                    className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                      activeMainTab === 'listings' ? 'bg-green-50 text-green-700' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    My Listings
                  </button>
                  <button 
                    onClick={() => setActiveMainTab('orders')}
                    className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                      activeMainTab === 'orders' ? 'bg-green-50 text-green-700' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                    Orders
                  </button>
                  <button 
                    onClick={() => setActiveMainTab('settings')}
                    className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                      activeMainTab === 'settings' ? 'bg-green-50 text-green-700' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Settings
                  </button>
                </nav>
              </div>
            </div>
          </div>
          
          {/* Main content */}
          <div className="col-span-1 md:col-span-2">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
                {error}
              </div>
            )}
            
            {/* New Seller Welcome Banner */}
            {showWelcome && accountStatus && (
              <NewSellerWelcome 
                accountStatus={accountStatus} 
                onClose={() => setShowWelcome(false)} 
              />
            )}
            
            {activeMainTab === 'dashboard' && (
              <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-medium">Seller Dashboard</h2>
                  <Link 
                    to="/tools/new"
                    className="bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-800"
                  >
                    + New Listing
                  </Link>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <button 
                    onClick={() => setActiveMainTab('listings')}
                    className="bg-gray-50 p-4 rounded-lg text-left hover:bg-gray-100 transition-colors"
                  >
                    <h3 className="text-sm font-medium text-gray-500 mb-1">ACTIVE LISTINGS</h3>
                    <p className="text-2xl font-bold">{listings.length || 0}</p>
                  </button>
                  <button 
                    onClick={() => setActiveMainTab('orders')}
                    className="bg-gray-50 p-4 rounded-lg text-left hover:bg-gray-100 transition-colors"
                  >
                    <h3 className="text-sm font-medium text-gray-500 mb-1">ORDERS</h3>
                    <p className="text-2xl font-bold">{ordersCount || 0}</p>
                  </button>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="text-sm font-medium text-gray-500 mb-1">TOTAL SALES</h3>
                    <p className="text-2xl font-bold">${totalSales.toFixed(2)}</p>
                  </div>
                </div>
                
                <div className="border-t border-gray-200 pt-6 mb-6">
                  <h3 className="text-lg font-medium mb-4">Recent Offers</h3>
                  {offers.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 rounded-lg">
                      <p className="text-gray-500">No offers yet.</p>
                      <p className="text-sm text-gray-400 mt-2">When you receive offers, they will appear here.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {offers.map(offer => (
                        <div key={offer.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                          <div className="flex items-start gap-4">
                            <div className="w-16 h-16 bg-gray-100 rounded flex-shrink-0 flex items-center justify-center">
                              {/* Placeholder for tool image */}
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                            
                            <div className="flex-grow">
                              <div className="flex justify-between items-start">
                                <div>
                                  <h4 className="font-medium text-gray-900">{offer.toolTitle}</h4>
                                  
                                  <div className="flex items-center mt-1">
                                    <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center mr-2">
                                      {offer.buyerPhoto ? (
                                        <img src={offer.buyerPhoto} alt="" className="h-8 w-8 rounded-full" />
                                      ) : (
                                        <span className="text-xs font-medium text-gray-500">
                                          {offer.buyerName?.charAt(0)?.toUpperCase() || '?'}
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-sm text-gray-600">
                                      Offer from <span className="font-medium">{offer.buyerName}</span>
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="text-right">
                                  <div className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                                    offer.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                                    offer.status === 'accepted' ? 'bg-green-100 text-green-800' : 
                                    offer.status === 'countered' ? 'bg-blue-100 text-blue-800' : 
                                    offer.status === 'declined' ? 'bg-red-100 text-red-800' : 
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    {offer.status.charAt(0).toUpperCase() + offer.status.slice(1)}
                                  </div>
                                  
                                  <div className="mt-1 flex space-x-2">
                                    <div className="text-sm text-gray-500 line-through">${offer.originalPrice.toFixed(2)}</div>
                                    <div className="text-sm font-medium text-green-700">${offer.currentPrice.toFixed(2)}</div>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="mt-2 flex justify-end">
                                <button className="text-sm text-benchlot-primary hover:text-benchlot-secondary">
                                  View Details
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      {offers.length > 3 && (
                        <div className="text-center mt-4">
                          <button className="text-benchlot-primary hover:text-benchlot-secondary font-medium">
                            View All Offers
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="border-t border-gray-200 pt-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium">Your Listings</h3>
                    <button 
                      onClick={() => setActiveMainTab('listings')}
                      className="text-benchlot-primary hover:text-benchlot-secondary font-medium text-sm"
                    >
                      View All
                    </button>
                  </div>
                  
                  {listings.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 rounded-lg">
                      <p className="text-gray-500">No listings yet.</p>
                      <Link to="/tools/new" className="text-green-700 font-medium underline mt-2 inline-block">
                        Create your first listing
                      </Link>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {listings.slice(0, 2).map(listing => (
                        <div key={listing.id} className="border border-gray-200 rounded-lg overflow-hidden">
                          <div className="aspect-w-16 aspect-h-9 bg-gray-200">
                            {listing.images?.[0] ? (
                              <img src={listing.images[0]} alt={listing.name} className="object-cover" />
                            ) : (
                              <div className="flex items-center justify-center h-full">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                              </div>
                            )}
                          </div>
                          <div className="p-4">
                            <h4 className="font-medium">{listing.name}</h4>
                            <p className="text-green-700 font-medium mt-1">${listing.price.toFixed(2)}</p>
                            <div className="flex justify-between mt-3">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                listing.status === 'active' ? 'bg-green-100 text-green-800' : 
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {listing.status}
                              </span>
                              <Link to={`/tools/edit/${listing.id}`} className="text-green-700 text-sm font-medium">
                                Edit
                              </Link>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {activeMainTab === 'listings' && (
              <div className="bg-white rounded-lg shadow-md">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex justify-between items-center">
                    <h2 className="text-xl font-medium text-stone-800">My Listings</h2>
                    <Link 
                      to="/tools/new"
                      className="bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-800"
                    >
                      + New Listing
                    </Link>
                  </div>
                </div>
                
                <div className="p-6">
                  <MyListings />
                </div>
              </div>
            )}
            
            {activeMainTab === 'orders' && (
              <div className="bg-white rounded-lg shadow-md">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-xl font-medium text-stone-800">Orders</h2>
                  <p className="text-stone-600 text-sm mt-1">Manage and track orders from your customers</p>
                </div>
                
                <div className="p-6">
                  {/* Filter and search controls */}
                  <div className="flex flex-col md:flex-row gap-4 mb-6">
                    <div className="relative flex-1">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <input 
                        type="text" 
                        placeholder="Search orders..." 
                        className="pl-10 pr-3 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-benchlot-primary focus:border-benchlot-primary"
                      />
                    </div>
                    
                    <div className="flex space-x-2">
                      <select className="border border-gray-300 rounded-md py-2 pl-3 pr-10 text-gray-700 focus:outline-none focus:ring-1 focus:ring-benchlot-primary focus:border-benchlot-primary">
                        <option value="all">All Orders</option>
                        <option value="pending">Pending</option>
                        <option value="processing">Processing</option>
                        <option value="shipped">Shipped</option>
                        <option value="delivered">Delivered</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                      
                      <select className="border border-gray-300 rounded-md py-2 pl-3 pr-10 text-gray-700 focus:outline-none focus:ring-1 focus:ring-benchlot-primary focus:border-benchlot-primary">
                        <option value="newest">Newest First</option>
                        <option value="oldest">Oldest First</option>
                        <option value="highest">Highest Price</option>
                        <option value="lowest">Lowest Price</option>
                      </select>
                    </div>
                  </div>
                  
                  {/* Orders list */}
                  <div className="space-y-4">
                    {ordersCount === 0 ? (
                      <div className="text-center py-8 bg-gray-50 rounded-lg">
                        <Package className="mx-auto h-12 w-12 text-gray-400" />
                        <p className="mt-4 text-gray-500 font-medium">No orders yet</p>
                        <p className="text-sm text-gray-400 mt-2">
                          When customers place orders for your listings, they will appear here.
                        </p>
                      </div>
                    ) : (
                      // Mock orders for demonstration
                      [1, 2, 3].map(i => (
                        <div key={i} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                          <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                            <div>
                              <div className="flex items-center">
                                <h3 className="font-medium">Order #{1000 + i}</h3>
                                <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  i === 1 ? 'bg-yellow-100 text-yellow-800' : 
                                  i === 2 ? 'bg-green-100 text-green-800' : 
                                  'bg-blue-100 text-blue-800'
                                }`}>
                                  {i === 1 ? 'Processing' : i === 2 ? 'Shipped' : 'Pending'}
                                </span>
                              </div>
                              <p className="text-sm text-gray-500 mt-1">Placed on {new Date().toLocaleDateString()}</p>
                              <div className="mt-3 flex items-center">
                                <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                                  <span className="text-xs font-medium text-gray-500">
                                    {String.fromCharCode(64 + i)}
                                  </span>
                                </div>
                                <div className="ml-2 text-sm">
                                  <p className="font-medium text-gray-900">Customer Name</p>
                                  <p className="text-gray-500">customer@example.com</p>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex flex-col items-end">
                              <p className="text-lg font-bold text-gray-900">${(50 * i).toFixed(2)}</p>
                              <p className="text-sm text-gray-500">{i + 1} items</p>
                              <button className="mt-3 inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-benchlot-primary hover:bg-benchlot-secondary">
                                View Details
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {activeMainTab === 'settings' && (
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="p-6 border-b">
                  <h2 className="text-xl font-medium text-stone-800">Seller Settings</h2>
                  <p className="text-stone-600 text-sm mt-1">Manage your seller profile, policies, and preferences</p>
                </div>
                
                {/* Status messages */}
                {success && (
                  <div className="m-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md mb-6 flex items-center">
                    <Check className="h-5 w-5 mr-2" />
                    Seller settings saved successfully!
                  </div>
                )}
                
                <div className="p-6">
                  {/* Tabs */}
                  <div className="border-b border-stone-200 mb-6">
                    <nav className="-mb-px flex space-x-8">
                      <button
                        onClick={() => setActiveSettingsTab('business')}
                        className={`pb-4 px-1 ${
                          activeSettingsTab === 'business'
                            ? 'border-b-2 border-benchlot-primary text-benchlot-primary'
                            : 'border-transparent text-stone-500 hover:border-stone-300 hover:text-stone-700'
                        } flex items-center`}
                      >
                        <Briefcase className="h-4 w-4 mr-2" />
                        Business Details
                      </button>
                      
                      <button
                        onClick={() => setActiveSettingsTab('policies')}
                        className={`pb-4 px-1 ${
                          activeSettingsTab === 'policies'
                            ? 'border-b-2 border-benchlot-primary text-benchlot-primary'
                            : 'border-transparent text-stone-500 hover:border-stone-300 hover:text-stone-700'
                        } flex items-center`}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Store Policies
                      </button>
                      
                      <button
                        onClick={() => setActiveSettingsTab('shipping')}
                        className={`pb-4 px-1 ${
                          activeSettingsTab === 'shipping'
                            ? 'border-b-2 border-benchlot-primary text-benchlot-primary'
                            : 'border-transparent text-stone-500 hover:border-stone-300 hover:text-stone-700'
                        } flex items-center`}
                      >
                        <Truck className="h-4 w-4 mr-2" />
                        Shipping & Pickup
                      </button>
                    </nav>
                  </div>
                  
                  {/* Business Details Tab Content */}
                  {activeSettingsTab === 'business' && (
                    <div className="space-y-6">
                      {/* Business Name */}
                      <div>
                        <label 
                          htmlFor="businessName" 
                          className="block text-sm font-medium text-stone-700 mb-1"
                        >
                          Business Name
                        </label>
                        <input
                          type="text"
                          id="businessName"
                          name="businessName"
                          value={sellerData.businessName}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-1 focus:ring-benchlot-primary focus:border-benchlot-primary"
                          placeholder="Your business or shop name"
                        />
                      </div>
                      
                      {/* Business Type */}
                      <div>
                        <label 
                          htmlFor="businessType" 
                          className="block text-sm font-medium text-stone-700 mb-1"
                        >
                          Business Type
                        </label>
                        <select
                          id="businessType"
                          name="businessType"
                          value={sellerData.businessType}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-1 focus:ring-benchlot-primary focus:border-benchlot-primary bg-white"
                        >
                          <option value="individual">Individual / Sole Proprietor</option>
                          <option value="professional">Professional / Contractor</option>
                          <option value="company">Registered Business / Company</option>
                        </select>
                      </div>
                      
                      {/* Business Description */}
                      <div>
                        <label 
                          htmlFor="businessDescription" 
                          className="block text-sm font-medium text-stone-700 mb-1"
                        >
                          Business Description
                        </label>
                        <textarea
                          id="businessDescription"
                          name="businessDescription"
                          value={sellerData.businessDescription}
                          onChange={handleChange}
                          rows="4"
                          className="w-full px-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-1 focus:ring-benchlot-primary focus:border-benchlot-primary"
                          placeholder="Describe your business, expertise, and the types of tools you offer"
                        ></textarea>
                      </div>
                      
                      {/* Contact Information */}
                      <div className="pt-4 border-t border-stone-200">
                        <h3 className="text-lg font-medium mb-4">Contact Information</h3>
                        
                        <div className="space-y-4">
                          {/* Contact Email */}
                          <div>
                            <label 
                              htmlFor="contactEmail" 
                              className="block text-sm font-medium text-stone-700 mb-1"
                            >
                              Business Contact Email
                            </label>
                            <input
                              type="email"
                              id="contactEmail"
                              name="contactEmail"
                              value={sellerData.contactEmail}
                              onChange={handleChange}
                              className="w-full px-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-1 focus:ring-benchlot-primary focus:border-benchlot-primary"
                              placeholder="Your business email address"
                            />
                          </div>
                          
                          {/* Contact Phone */}
                          <div>
                            <label 
                              htmlFor="contactPhone" 
                              className="block text-sm font-medium text-stone-700 mb-1"
                            >
                              Business Phone Number
                            </label>
                            <input
                              type="tel"
                              id="contactPhone"
                              name="contactPhone"
                              value={sellerData.contactPhone}
                              onChange={handleChange}
                              className="w-full px-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-1 focus:ring-benchlot-primary focus:border-benchlot-primary"
                              placeholder="Your business phone number"
                            />
                          </div>
                          
                          {/* Preferred Contact Method */}
                          <div>
                            <label className="block text-sm font-medium text-stone-700 mb-2">
                              Preferred Contact Method
                            </label>
                            <div className="flex space-x-4">
                              <label className="flex items-center">
                                <input
                                  type="radio"
                                  name="preferredContactMethod"
                                  value="email"
                                  checked={sellerData.preferredContactMethod === 'email'}
                                  onChange={handleChange}
                                  className="h-4 w-4 text-benchlot-primary focus:ring-benchlot-primary border-stone-300"
                                />
                                <span className="ml-2 text-sm text-stone-700">Email</span>
                              </label>
                              <label className="flex items-center">
                                <input
                                  type="radio"
                                  name="preferredContactMethod"
                                  value="phone"
                                  checked={sellerData.preferredContactMethod === 'phone'}
                                  onChange={handleChange}
                                  className="h-4 w-4 text-benchlot-primary focus:ring-benchlot-primary border-stone-300"
                                />
                                <span className="ml-2 text-sm text-stone-700">Phone</span>
                              </label>
                              <label className="flex items-center">
                                <input
                                  type="radio"
                                  name="preferredContactMethod"
                                  value="message"
                                  checked={sellerData.preferredContactMethod === 'message'}
                                  onChange={handleChange}
                                  className="h-4 w-4 text-benchlot-primary focus:ring-benchlot-primary border-stone-300"
                                />
                                <span className="ml-2 text-sm text-stone-700">Platform Message</span>
                              </label>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Stripe Connect */}
                      <div className="pt-4 border-t border-stone-200">
                        <h3 className="text-lg font-medium mb-4">Payment Processing</h3>
                        
                        <div className="bg-stone-50 p-4 rounded-lg border border-stone-200 mb-4">
                          <div className="flex">
                            <div className="flex-shrink-0">
                              <DollarSign className="h-5 w-5 text-stone-500" />
                            </div>
                            <div className="ml-3">
                              <h3 className="text-sm font-medium text-stone-800">Connect a Payment Account</h3>
                              <p className="text-xs text-stone-500 mt-1">
                                To receive payments, you need to connect your Stripe account. This allows us to securely process payments and transfer funds to your bank account.
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        {sellerData.financial.accountLinked ? (
                          <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                            <div className="flex">
                              <div className="flex-shrink-0">
                                <Check className="h-5 w-5 text-green-500" />
                              </div>
                              <div className="ml-3">
                                <h3 className="text-sm font-medium text-green-800">Payment Account Connected</h3>
                                <p className="text-xs text-green-700 mt-1">
                                  Your Stripe account is connected. You can now receive payments for your tool sales.
                                </p>
                                <button
                                  type="button"
                                  className="mt-2 text-sm text-benchlot-primary hover:text-benchlot-secondary flex items-center"
                                  onClick={handleAccessStripeDashboard}
                                >
                                  <ExternalLink className="h-4 w-4 mr-1" />
                                  View Stripe Dashboard
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={handleAccessStripeDashboard}
                            className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-benchlot-primary hover:bg-benchlot-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-benchlot-primary"
                          >
                            Connect with Stripe
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Store Policies Tab Content */}
                  {activeSettingsTab === 'policies' && (
                    <div className="space-y-6">
                      {/* Return Policy */}
                      <div className="border-b border-stone-200 pb-6">
                        <h3 className="text-lg font-medium mb-4">Return Policy</h3>
                        
                        <div className="space-y-4">
                          <ToggleSwitch
                            id="accepts-returns"
                            checked={sellerData.policies.returns.acceptsReturns}
                            onChange={() => handleToggleChange('policies.returns.acceptsReturns')}
                            label="Accept Returns"
                            description="Allow customers to return tools under certain conditions"
                          />
                          
                          <div className="ml-10">
                            <label 
                              htmlFor="returnPeriod" 
                              className="block text-sm font-medium text-stone-700 mb-1"
                            >
                              Return Period (days)
                            </label>
                            <input
                              type="number"
                              id="returnPeriod"
                              name="policies.returns.returnPeriod"
                              value={sellerData.policies.returns.returnPeriod}
                              onChange={handleNestedNumberChange}
                              min="0"
                              max="90"
                              className="w-32 px-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-1 focus:ring-benchlot-primary focus:border-benchlot-primary"
                            />
                            
                            <div className="mt-4">
                              <label 
                                htmlFor="returnConditions" 
                                className="block text-sm font-medium text-stone-700 mb-1"
                              >
                                Return Conditions
                              </label>
                              <textarea
                                id="returnConditions"
                                name="policies.returns.conditions"
                                value={sellerData.policies.returns.conditions}
                                onChange={handleChange}
                                rows="3"
                                className="w-full px-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-1 focus:ring-benchlot-primary focus:border-benchlot-primary"
                                placeholder="Describe any conditions for accepting returns"
                              ></textarea>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-stone-50 p-5 rounded-lg border border-stone-200">
                        <h3 className="text-sm font-medium text-stone-800 mb-2">Policy Information</h3>
                        <p className="text-xs text-stone-500">
                          These settings will be applied as your default policies for all your tools. You can override these settings for specific listings when creating or editing a tool.
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {/* Shipping Tab Content */}
                  {activeSettingsTab === 'shipping' && (
                    <div className="space-y-6">
                      {/* Shipping Methods Section */}
                      <div className="mb-6">
                        <div className="flex items-start mb-4">
                          <div className="flex-shrink-0 p-1.5 bg-benchlot-accent-light rounded-full text-benchlot-primary">
                            <Truck className="h-5 w-5" />
                          </div>
                          <div className="ml-3">
                            <h3 className="text-sm font-medium text-stone-800">Shipping Methods</h3>
                            <p className="text-xs text-stone-500 mt-1">Select the shipping options you offer to buyers</p>
                          </div>
                        </div>
                        
                        <div className="ml-10 space-y-4">
                          <div className="p-4 bg-stone-50 border border-stone-200 rounded-lg">
                            <h4 className="font-medium mb-3">Available Shipping Methods</h4>
                            <div className="space-y-3">
                              <div className="flex items-center">
                                <input
                                  id="method-standard"
                                  type="checkbox"
                                  className="h-4 w-4 text-benchlot-primary border-stone-300 rounded focus:ring-benchlot-primary"
                                  checked={sellerData.policies.shipping.shippingMethods?.includes('standard')}
                                  onChange={() => handleShippingMethodChange('standard')}
                                />
                                <label htmlFor="method-standard" className="ml-2 block text-sm">
                                  <span className="font-medium text-stone-700">Standard Shipping</span>
                                  <p className="text-xs text-stone-500">Regular delivery (3-5 business days)</p>
                                </label>
                              </div>
                              
                              <div className="flex items-center">
                                <input
                                  id="method-express"
                                  type="checkbox"
                                  className="h-4 w-4 text-benchlot-primary border-stone-300 rounded focus:ring-benchlot-primary"
                                  checked={sellerData.policies.shipping.shippingMethods?.includes('express')}
                                  onChange={() => handleShippingMethodChange('express')}
                                />
                                <label htmlFor="method-express" className="ml-2 block text-sm">
                                  <span className="font-medium text-stone-700">Express Shipping</span>
                                  <p className="text-xs text-stone-500">Faster delivery (1-2 business days)</p>
                                </label>
                              </div>
                              
                              <div className="flex items-center">
                                <input
                                  id="method-economy"
                                  type="checkbox"
                                  className="h-4 w-4 text-benchlot-primary border-stone-300 rounded focus:ring-benchlot-primary"
                                  checked={sellerData.policies.shipping.shippingMethods?.includes('economy')}
                                  onChange={() => handleShippingMethodChange('economy')}
                                />
                                <label htmlFor="method-economy" className="ml-2 block text-sm">
                                  <span className="font-medium text-stone-700">Economy Shipping</span>
                                  <p className="text-xs text-stone-500">Budget-friendly (5-7 business days)</p>
                                </label>
                              </div>
                              
                              <div className="flex items-center">
                                <input
                                  id="method-freight"
                                  type="checkbox"
                                  className="h-4 w-4 text-benchlot-primary border-stone-300 rounded focus:ring-benchlot-primary"
                                  checked={sellerData.policies.shipping.shippingMethods?.includes('freight')}
                                  onChange={() => handleShippingMethodChange('freight')}
                                />
                                <label htmlFor="method-freight" className="ml-2 block text-sm">
                                  <span className="font-medium text-stone-700">Freight</span>
                                  <p className="text-xs text-stone-500">For large equipment</p>
                                </label>
                              </div>
                            </div>
                          </div>
                          
                          <div className="p-4 bg-white border border-stone-200 rounded-lg">
                            <h4 className="font-medium mb-2 text-sm">Default Shipping Price</h4>
                            <div className="flex items-center">
                              <span className="text-stone-600 mr-2">$</span>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                className="border-stone-300 focus:ring-benchlot-primary focus:border-benchlot-primary block w-full sm:text-sm rounded-md"
                                value={sellerData.policies.shipping.defaultShippingPrice}
                                onChange={(e) => {
                                  setSellerData({
                                    ...sellerData,
                                    policies: {
                                      ...sellerData.policies,
                                      shipping: {
                                        ...sellerData.policies.shipping,
                                        defaultShippingPrice: parseFloat(e.target.value) || 0
                                      }
                                    }
                                  });
                                }}
                              />
                            </div>
                            <p className="text-xs text-stone-500 mt-1">Applied when no specific price is set</p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Free Shipping Options */}
                      <div className="mb-6">
                        <div className="flex items-start mb-4">
                          <div className="ml-3">
                            <h3 className="text-sm font-medium text-stone-800">Free Shipping Options</h3>
                            <p className="text-xs text-stone-500 mt-1">Configure free shipping offers for your buyers</p>
                          </div>
                        </div>
                        
                        <div className="ml-4 bg-white border border-stone-200 rounded-lg overflow-hidden p-4">
                          <ToggleSwitch
                            id="offers-free-shipping"
                            checked={sellerData.policies.shipping.offersFreeShipping}
                            onChange={() => handleToggleChange('policies.shipping.offersFreeShipping')}
                            label="Offer Free Shipping"
                            description="Provide free shipping on orders that meet the threshold"
                          />
                          
                          {sellerData.policies.shipping.offersFreeShipping && (
                            <div className="ml-9 mt-2 mb-4">
                              <div className="p-3 bg-stone-50 border border-stone-200 rounded-md">
                                <label className="block text-sm font-medium text-stone-700 mb-1">
                                  Free Shipping Threshold ($)
                                </label>
                                <div className="flex items-center">
                                  <span className="text-stone-600 mr-2">$</span>
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    className="border-stone-300 focus:ring-benchlot-primary focus:border-benchlot-primary block w-full sm:text-sm rounded-md"
                                    value={sellerData.policies.shipping.freeShippingThreshold}
                                    onChange={(e) => {
                                      setSellerData({
                                        ...sellerData,
                                        policies: {
                                          ...sellerData.policies,
                                          shipping: {
                                            ...sellerData.policies.shipping,
                                            freeShippingThreshold: parseFloat(e.target.value) || 0
                                          }
                                        }
                                      });
                                    }}
                                  />
                                </div>
                                <p className="text-xs text-stone-500 mt-1">Orders above this amount qualify for free shipping</p>
                              </div>
                            </div>
                          )}
                          
                          <ToggleSwitch
                            id="offer-local-pickup"
                            checked={sellerData.policies.shipping.offerLocalPickup}
                            onChange={() => handleToggleChange('policies.shipping.offerLocalPickup')}
                            label="Offer Local Pickup"
                            description="Allow buyers to pick up items in person (no shipping)"
                          />
                        </div>
                      </div>
                      
                      {/* Shipping Policy Information */}
                      <div className="bg-stone-50 p-5 rounded-lg border border-stone-200 mb-6">
                        <div className="flex">
                          <div className="ml-3">
                            <h3 className="text-sm font-medium text-stone-800">Shipping Policies</h3>
                            <p className="text-xs text-stone-500 mt-1">
                              These settings will be applied as your default shipping options for all your tools. You can override these settings for specific listings when creating or editing a tool.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Save button */}
                  <div className="flex justify-end mt-8">
                    <button
                      onClick={handleSaveSettings}
                      className="px-4 py-2 bg-benchlot-primary text-white rounded-md hover:bg-benchlot-secondary focus:outline-none focus:ring-2 focus:ring-benchlot-primary focus:ring-offset-2 flex items-center"
                      disabled={saving}
                    >
                      {saving ? (
                        <>
                          <Loader className="h-4 w-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : 'Save Settings'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default SellerDashboardPage;