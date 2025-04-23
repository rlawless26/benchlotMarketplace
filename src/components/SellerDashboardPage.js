import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../firebase/hooks/useAuth';
import { getConnectAccountStatus, getConnectDashboardLink } from '../utils/stripeService';
import NewSellerWelcome from './NewSellerWelcome';
import { openAuthModal } from '../utils/featureFlags';

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
        
        // TODO: Fetch seller's listings
        // This would come from a Firebase query
        setListings([]);
        
        // TODO: Fetch recent orders
        // This would come from a Firebase query
        setRecentOrders([]);
        
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
                  <Link to="/seller/dashboard" className="flex items-center px-3 py-2 text-sm font-medium rounded-md bg-green-50 text-green-700">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                    Dashboard
                  </Link>
                  <Link to="/seller/listings" className="flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-700 hover:bg-gray-50">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    My Listings
                  </Link>
                  <Link to="/seller/orders" className="flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-700 hover:bg-gray-50">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                    Orders
                  </Link>
                  <Link to="/seller/earnings" className="flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-700 hover:bg-gray-50">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Earnings
                  </Link>
                  <Link to="/seller/analytics" className="flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-700 hover:bg-gray-50">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    Analytics
                  </Link>
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
            
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-medium">Seller Dashboard</h2>
                <Link 
                  to="/seller/tools/new"
                  className="bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-800"
                >
                  + New Listing
                </Link>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-500 mb-1">ACTIVE LISTINGS</h3>
                  <p className="text-2xl font-bold">{listings.length || 0}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-500 mb-1">PENDING ORDERS</h3>
                  <p className="text-2xl font-bold">{recentOrders.filter(o => o.status === 'pending').length || 0}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-500 mb-1">TOTAL SALES</h3>
                  <p className="text-2xl font-bold">$0.00</p>
                </div>
              </div>
              
              <div className="border-t border-gray-200 pt-6 mb-6">
                <h3 className="text-lg font-medium mb-4">Recent Orders</h3>
                {recentOrders.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-lg">
                    <p className="text-gray-500">No orders yet.</p>
                    <p className="text-sm text-gray-400 mt-2">When you receive orders, they will appear here.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {recentOrders.map(order => (
                          <tr key={order.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{order.id}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.date}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.customerName}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${order.amount.toFixed(2)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                order.status === 'completed' ? 'bg-green-100 text-green-800' : 
                                order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {order.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-medium mb-4">Your Listings</h3>
                {listings.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-lg">
                    <p className="text-gray-500">No listings yet.</p>
                    <Link to="/seller/tools/new" className="text-green-700 font-medium underline mt-2 inline-block">
                      Create your first listing
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {listings.map(listing => (
                      <div key={listing.id} className="border border-gray-200 rounded-lg overflow-hidden">
                        <div className="aspect-w-16 aspect-h-9 bg-gray-200">
                          <img src={listing.imageUrl} alt={listing.title} className="object-cover" />
                        </div>
                        <div className="p-4">
                          <h4 className="font-medium">{listing.title}</h4>
                          <p className="text-green-700 font-medium mt-1">${listing.price.toFixed(2)}</p>
                          <div className="flex justify-between mt-3">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              listing.status === 'active' ? 'bg-green-100 text-green-800' : 
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {listing.status}
                            </span>
                            <Link to={`/seller/listings/${listing.id}`} className="text-green-700 text-sm font-medium">
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
          </div>
        </div>
      </main>
    </div>
  );
};

export default SellerDashboardPage;