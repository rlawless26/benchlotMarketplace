import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../firebase/hooks/useAuth';
import { getConnectAccountStatus, getSellerBalance, getSellerTransfers, getSellerOrders } from '../utils/stripeService';
import NewSellerWelcome from './NewSellerWelcome';
import { openAuthModal } from '../utils/featureFlags';
import { DollarSign, Package } from 'lucide-react';
import { getToolsByUserId } from '../firebase/models/toolModel';
import { getUserSellerOffers } from '../firebase/models/offerModel';
import MyListings from './MyListings';
import StripeStatusBanner from './StripeStatusBanner';
import Avatar from './ui/Avatar';

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
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [accountStatus, setAccountStatus] = useState(null);
  const [error, setError] = useState(null);
  const [listings, setListings] = useState([]);
  const [showWelcome, setShowWelcome] = useState(false);
  const [activeMainTab, setActiveMainTab] = useState('dashboard');

  // State for offers
  const [offers, setOffers] = useState([]);
  const [totalSales, setTotalSales] = useState(0);
  const [ordersCount, setOrdersCount] = useState(0);

  // State for earnings/payouts
  const [sellerBalance, setSellerBalance] = useState({ available: 0, pending: 0 });
  const [transfers, setTransfers] = useState([]);
  const [sellerOrders, setSellerOrders] = useState([]);
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
        
        // eslint-disable-next-line no-console
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
              
            // Note: previously this block redirected sellers with incomplete Stripe
            // setup to /seller/onboarding. We now let them land on the dashboard
            // and surface the prompt via <StripeStatusBanner /> instead, so sellers
            // can manage their (already-published) listings while finishing payouts.
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
            }
            // If no bank account is verified, fall through and let StripeStatusBanner prompt them.
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
          }
          // If no bank account is verified, fall through and let StripeStatusBanner prompt them.
        }
        
        // Check if this is a new seller (from the query parameter)
        const isNewSeller = new URLSearchParams(location.search).get('newSeller') === 'true';
        setShowWelcome(isNewSeller);
        
        // If it's a new seller arriving, clean the URL for better sharing and bookmarking
        if (isNewSeller) {
          window.history.replaceState({}, document.title, '/seller/dashboard');
        }
        
        // Fetch real seller data from APIs
        try {
          const [ordersData, balanceData, transfersData] = await Promise.allSettled([
            getSellerOrders(user.uid),
            getSellerBalance(user.uid),
            getSellerTransfers(user.uid, 10)
          ]);

          if (ordersData.status === 'fulfilled') {
            setSellerOrders(ordersData.value.orders || []);
            setOrdersCount(ordersData.value.totalOrders || 0);
            setTotalSales(ordersData.value.totalEarnings || 0);
          }

          if (balanceData.status === 'fulfilled') {
            setSellerBalance({
              available: balanceData.value.available || 0,
              pending: balanceData.value.pending || 0
            });
          }

          if (transfersData.status === 'fulfilled') {
            setTransfers(transfersData.value.transfers || []);
          }
        } catch (dataError) {
          console.error('Error fetching seller financial data:', dataError);
          // Non-fatal - dashboard still loads with zero values
        }

        // Load listings and offers for the dashboard overview
        try {
          const [userListings, sellerOffers] = await Promise.allSettled([
            getToolsByUserId(user.uid),
            getUserSellerOffers(user.uid, { limit: 5 }),
          ]);

          if (userListings.status === 'fulfilled') {
            setListings(userListings.value || []);
          }

          if (sellerOffers.status === 'fulfilled') {
            setOffers(sellerOffers.value || []);
          }
        } catch (dataError) {
          console.error('Error fetching listings/offers:', dataError);
        }

        setLoading(false);
      } catch (err) {
        console.error('Error loading seller data:', err);
        setError(err.message || 'Failed to load seller dashboard data.');
        setLoading(false);
      }
    };
    
    loadSellerData();
  }, [user, navigate, loading, location]);
  
  if (loading) {
    return (
      <div className="bg-bone min-h-screen">
        <main className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-spruce"></div>
            <span className="ml-2 text-gray-600">Loading...</span>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="bg-bone min-h-screen">
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left sidebar */}
          <div className="col-span-1">
            <div className="bg-bone-light rounded-lg shadow-md border border-default p-6 mb-6">
              <div className="flex items-center space-x-4 mb-6">
                <Avatar
                  src={user?.photoURL}
                  name={user?.profile?.sellerName || user?.displayName || user?.email}
                  size="lg"
                />
                <div>
                  <h2 className="text-xl font-medium">{user?.profile?.sellerName || user?.displayName || 'Seller'}</h2>
                  <p className="text-gray-600 text-sm">{user?.profile?.location || user?.location || ''}</p>
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
                  <div className="mt-2 text-sm text-spruce bg-bone-dark p-2 rounded">
                    <p>Your seller account is being activated. This usually takes a few minutes. Feel free to continue exploring your dashboard.</p>
                    <button 
                      onClick={() => window.location.reload()} 
                      className="mt-2 text-xs bg-bone-dark hover:bg-bone-dark text-spruce font-medium py-1 px-2 rounded"
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
                      activeMainTab === 'dashboard' ? 'bg-green-50 text-spruce' : 'text-gray-700 hover:bg-gray-50'
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
                      activeMainTab === 'listings' ? 'bg-green-50 text-spruce' : 'text-gray-700 hover:bg-gray-50'
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
                      activeMainTab === 'orders' ? 'bg-green-50 text-spruce' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                    Orders
                  </button>
                  <button
                    onClick={() => setActiveMainTab('earnings')}
                    className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                      activeMainTab === 'earnings' ? 'bg-green-50 text-spruce' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <DollarSign className="h-5 w-5 mr-2" />
                    Earnings
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

            <StripeStatusBanner className="mb-6" />

            {/* New Seller Welcome Banner */}
            {showWelcome && accountStatus && (
              <NewSellerWelcome 
                accountStatus={accountStatus} 
                onClose={() => setShowWelcome(false)} 
              />
            )}
            
            {activeMainTab === 'dashboard' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-display font-medium text-stone-800">Seller Dashboard</h2>
                  <Link
                    to="/seller/onboard-and-list"
                    className="bg-honey text-dark-teal px-4 py-2 rounded-md text-sm font-medium hover:bg-honey-light"
                  >
                    + New Listing
                  </Link>
                </div>

                {/* Zero state — shown when the seller has no activity yet */}
                {ordersCount === 0 && totalSales === 0 && sellerBalance.available === 0 && sellerBalance.pending === 0 ? (
                  <div className="bg-bone-light rounded-lg border border-default p-8 mb-6">
                    <h3 className="text-xl font-display font-medium text-spruce mb-3">
                      You're all set up — now let's get your first sale
                    </h3>
                    <p className="text-gray-700 mb-6">
                      Your seller account is active and your listings are visible to buyers.
                      Here are some things you can do to get things moving:
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="bg-gray-50 rounded-lg p-5">
                        <h4 className="font-medium text-dark-teal mb-1">List more tools</h4>
                        <p className="text-sm text-gray-600 mb-3">Sellers with 3+ listings get significantly more visibility.</p>
                        <Link to="/seller/onboard-and-list" className="text-sm font-medium text-spruce hover:underline">
                          Add a listing →
                        </Link>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-5">
                        <h4 className="font-medium text-dark-teal mb-1">Share your listings</h4>
                        <p className="text-sm text-gray-600 mb-3">Copy your listing link and share it with woodworking communities.</p>
                        <button
                          onClick={() => setActiveMainTab('listings')}
                          className="text-sm font-medium text-spruce hover:underline"
                        >
                          View your listings →
                        </button>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-5">
                        <h4 className="font-medium text-dark-teal mb-1">Scan your tools</h4>
                        <p className="text-sm text-gray-600 mb-3">Not sure what something is worth? Our scanner identifies and values tools from a photo.</p>
                        <Link to="/scan" className="text-sm font-medium text-spruce hover:underline">
                          Scan a tool →
                        </Link>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <button
                      onClick={() => setActiveMainTab('orders')}
                      className="bg-gray-50 p-4 rounded-lg text-left hover:bg-gray-100 transition-colors"
                    >
                      <h3 className="text-sm font-medium text-gray-500 mb-1">ORDERS</h3>
                      <p className="text-2xl font-bold">{ordersCount || 0}</p>
                    </button>
                    <button
                      onClick={() => setActiveMainTab('earnings')}
                      className="bg-gray-50 p-4 rounded-lg text-left hover:bg-gray-100 transition-colors"
                    >
                      <h3 className="text-sm font-medium text-gray-500 mb-1">TOTAL EARNINGS</h3>
                      <p className="text-2xl font-bold">${totalSales.toFixed(2)}</p>
                    </button>
                    <button
                      onClick={() => setActiveMainTab('earnings')}
                      className="bg-gray-50 p-4 rounded-lg text-left hover:bg-gray-100 transition-colors"
                    >
                      <h3 className="text-sm font-medium text-gray-500 mb-1">AVAILABLE</h3>
                      <p className="text-2xl font-bold text-spruce">${sellerBalance.available.toFixed(2)}</p>
                    </button>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="text-sm font-medium text-gray-500 mb-1">PENDING</h3>
                      <p className="text-2xl font-bold text-amber-600">${sellerBalance.pending.toFixed(2)}</p>
                    </div>
                  </div>
                )}
                
                {/* Recent Offers — only rendered when there are offers */}
                {offers.length > 0 && (
                  <div className="border-t border-gray-200 pt-6 mb-6">
                    <h3 className="text-lg font-medium mb-4">Recent Offers</h3>
                    <div className="space-y-4">
                      {offers.slice(0, 5).map(offer => (
                        <Link
                          key={offer.id}
                          to={`/messages?offer=${offer.id}`}
                          className="block border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-gray-900 truncate">{offer.toolTitle}</h4>
                              <p className="text-sm text-gray-500 mt-0.5">
                                Offer from {offer.buyerName || 'a buyer'}
                              </p>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                                offer.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                offer.status === 'accepted' ? 'bg-green-100 text-green-800' :
                                offer.status === 'countered' ? 'bg-blue-100 text-blue-800' :
                                offer.status === 'declined' ? 'bg-red-100 text-red-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {(offer.status || 'pending').charAt(0).toUpperCase() + (offer.status || 'pending').slice(1)}
                              </span>
                              <p className="text-sm font-medium text-honey mt-1">
                                ${(offer.currentPrice || 0).toFixed(2)}
                              </p>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Your Listings preview — only rendered when there are listings */}
                {listings.length > 0 && (
                  <div className={`${offers.length > 0 || ordersCount > 0 ? 'border-t border-gray-200' : ''} pt-6`}>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-medium">Your Listings</h3>
                      <button
                        onClick={() => setActiveMainTab('listings')}
                        className="text-spruce hover:text-spruce-light font-medium text-sm"
                      >
                        View All
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {listings.filter(l => l.status !== 'chest').slice(0, 4).map(listing => {
                        const imageUrl = listing.images?.[0]?.url || listing.images?.[0] || '';
                        const price = listing.current_price || listing.price || 0;
                        return (
                          <Link
                            key={listing.id}
                            to={`/tools/${listing.id}`}
                            className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                          >
                            <div className="h-32 bg-gray-100">
                              {imageUrl ? (
                                <img src={imageUrl} alt={listing.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="flex items-center justify-center h-full">
                                  <Package className="h-8 w-8 text-gray-300" />
                                </div>
                              )}
                            </div>
                            <div className="p-3">
                              <h4 className="font-medium text-sm truncate">{listing.name}</h4>
                              <div className="flex justify-between items-center mt-2">
                                <span className="text-honey font-medium text-sm">
                                  ${typeof price === 'number' ? price.toFixed(2) : '0.00'}
                                </span>
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                  listing.status === 'active' ? 'bg-green-100 text-green-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {listing.status === 'active' ? 'Live' : listing.status}
                                </span>
                              </div>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {activeMainTab === 'listings' && (
              <MyListings embedded />
            )}
            
            {activeMainTab === 'orders' && (
              <div>
                <div className="mb-6">
                  <h2 className="text-2xl font-display font-medium text-stone-800">Orders</h2>
                  <p className="text-stone-600 text-sm mt-1">Manage and track orders from your customers</p>
                </div>

                <div>
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
                        className="pl-10 pr-3 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-spruce focus:border-spruce"
                      />
                    </div>
                    
                    <div className="flex space-x-2">
                      <select className="border border-gray-300 rounded-md py-2 pl-3 pr-10 text-gray-700 focus:outline-none focus:ring-1 focus:ring-spruce focus:border-spruce">
                        <option value="all">All Orders</option>
                        <option value="pending">Pending</option>
                        <option value="processing">Processing</option>
                        <option value="shipped">Shipped</option>
                        <option value="delivered">Delivered</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                      
                      <select className="border border-gray-300 rounded-md py-2 pl-3 pr-10 text-gray-700 focus:outline-none focus:ring-1 focus:ring-spruce focus:border-spruce">
                        <option value="newest">Newest First</option>
                        <option value="oldest">Oldest First</option>
                        <option value="highest">Highest Price</option>
                        <option value="lowest">Lowest Price</option>
                      </select>
                    </div>
                  </div>
                  
                  {/* Orders list */}
                  <div className="space-y-4">
                    {sellerOrders.length === 0 ? (
                      <div className="text-center py-8 bg-gray-50 rounded-lg">
                        <Package className="mx-auto h-12 w-12 text-gray-400" />
                        <p className="mt-4 text-gray-500 font-medium">No orders yet</p>
                        <p className="text-sm text-gray-400 mt-2">
                          When customers place orders for your listings, they will appear here.
                        </p>
                      </div>
                    ) : (
                      sellerOrders.map(order => (
                        <div key={order.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                          <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                            <div>
                              <div className="flex items-center">
                                <h3 className="font-medium">Order #{order.id.slice(-6).toUpperCase()}</h3>
                                <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  order.status === 'paid' ? 'bg-yellow-100 text-yellow-800' :
                                  order.status === 'shipped' ? 'bg-blue-100 text-blue-800' :
                                  order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                                  order.status === 'refunded' ? 'bg-red-100 text-red-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                                </span>
                              </div>
                              <p className="text-sm text-gray-500 mt-1">
                                {order.createdAt?.seconds
                                  ? new Date(order.createdAt.seconds * 1000).toLocaleDateString()
                                  : 'Recently'}
                              </p>
                              <div className="mt-2 text-sm text-gray-600">
                                {order.items.map((item, idx) => (
                                  <span key={idx}>
                                    {item.name || item.title}{idx < order.items.length - 1 ? ', ' : ''}
                                  </span>
                                ))}
                              </div>
                            </div>

                            <div className="flex flex-col items-end">
                              <p className="text-lg font-bold text-gray-900">${order.sellerEarnings.toFixed(2)}</p>
                              <p className="text-xs text-gray-400">
                                ${order.sellerTotal.toFixed(2)} - ${order.platformFee.toFixed(2)} fee
                              </p>
                              <p className="text-sm text-gray-500">{order.items.length} item{order.items.length !== 1 ? 's' : ''}</p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {activeMainTab === 'earnings' && (
              <div>
                <div className="mb-6">
                  <h2 className="text-2xl font-display font-medium text-stone-800">Earnings & Payouts</h2>
                  <p className="text-stone-600 text-sm mt-1">Track your earnings, transfers, and available balance</p>
                </div>

                <div>
                  {/* Balance cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-5">
                      <h3 className="text-sm font-medium text-green-800 mb-1">Available Balance</h3>
                      <p className="text-3xl font-bold text-spruce">${sellerBalance.available.toFixed(2)}</p>
                      <p className="text-xs text-green-600 mt-1">Ready for payout</p>
                    </div>
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-5">
                      <h3 className="text-sm font-medium text-amber-800 mb-1">Pending Balance</h3>
                      <p className="text-3xl font-bold text-amber-600">${sellerBalance.pending.toFixed(2)}</p>
                      <p className="text-xs text-amber-600 mt-1">Processing from recent sales</p>
                    </div>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-5">
                      <h3 className="text-sm font-medium text-gray-700 mb-1">Total Earned</h3>
                      <p className="text-3xl font-bold text-gray-900">${totalSales.toFixed(2)}</p>
                      <p className="text-xs text-gray-500 mt-1">After 10% marketplace fee</p>
                    </div>
                  </div>

                  {/* Set up payouts contextual CTA — shown when Stripe Connect is incomplete */}
                  {accountStatus && !accountStatus.payoutsEnabled && (
                    <div className="bg-honey-light border border-honey rounded-lg p-5 mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="text-base font-medium text-dark-teal mb-1">
                          Set up payouts to start receiving earnings
                        </h3>
                        <p className="text-sm text-dark-teal/80">
                          You'll be redirected to Stripe to verify your identity and connect a bank account. Takes about 3 minutes.
                        </p>
                      </div>
                      <Link
                        to="/seller/onboarding"
                        className="bg-honey text-dark-teal px-5 py-2.5 rounded-md text-sm font-medium hover:bg-honey-light whitespace-nowrap border border-dark-teal/10"
                      >
                        Set Up Payouts →
                      </Link>
                    </div>
                  )}

                  {/* Fee explanation */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
                    <div className="flex">
                      <DollarSign className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div className="ml-3">
                        <h4 className="text-sm font-medium text-blue-800">How earnings work</h4>
                        <p className="text-xs text-blue-700 mt-1">
                          Benchlot charges a 10% marketplace fee on each sale (includes payment processing).
                          When a buyer purchases your item, your earnings (90% of the sale price) are
                          transferred to your connected bank account. Transfers typically arrive within 2-3 business days.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Transfer history */}
                  <h3 className="text-lg font-medium text-stone-800 mb-4">Transfer History</h3>
                  {transfers.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 rounded-lg">
                      <DollarSign className="mx-auto h-12 w-12 text-gray-400" />
                      <p className="mt-4 text-gray-500 font-medium">No transfers yet</p>
                      <p className="text-sm text-gray-400 mt-2">
                        When you make sales, your earnings transfers will appear here.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {transfers.map(transfer => (
                            <tr key={transfer.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                {new Date(transfer.created * 1000).toLocaleDateString()}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900">
                                {transfer.description || 'Sale earnings transfer'}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                  transfer.status === 'completed' ? 'bg-green-100 text-green-800' :
                                  transfer.status === 'reversed' ? 'bg-red-100 text-red-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {transfer.status.charAt(0).toUpperCase() + transfer.status.slice(1)}
                                </span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-right text-spruce">
                                ${transfer.amount.toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
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