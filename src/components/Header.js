// src/components/Header.js
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShoppingCart,
  Search,
  Heart,
  MessageSquare,
  User,
  Menu,
  ChevronDown,
  Plus,
  LogOut,
  List,
  Settings,
  Package,
  Hammer,
  X,
  Store
} from 'lucide-react';

// Import hooks from firebase
import { useAuth } from '../firebase/hooks/useAuth';
import { useWishlist } from '../firebase/hooks/useWishlist';
import useNotifications from '../firebase/hooks/useNotifications';
import { useMessages } from '../firebase/hooks/useMessages';

// Import components
import CartIcon from './CartIcon';
import AuthModal from './AuthModal';

// Import auth utils
import { onAuthModalRequested } from '../utils/featureFlags';

// Import centralized category data
import { toolCategories, toolSubcategories } from '../firebase/models/toolModel';

const Header = () => {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState('signin');

  // Use hooks to access user data, wishlist, and notifications
  const { user, isAuthenticated, signOut } = useAuth();
  const { count: wishlistCount } = useWishlist();
  const { totalCount: notificationCount } = useNotifications();
  const { unreadCount: messageCount } = useMessages();

  // Listen for auth modal events
  useEffect(() => {
    // Register for auth modal events
    const unsubscribe = onAuthModalRequested(({ mode, redirectPath }) => {
      // Open the auth modal with the requested mode
      setAuthMode(mode || 'signin');
      setAuthModalOpen(true);
    });

    return unsubscribe; // Cleanup on unmount
  }, []);

  // Create a ref for the profile menu
  const profileMenuRef = useRef(null);

  // Handle clicks outside of the profile menu to close it
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setProfileMenuOpen(false);
      }
    };

    // Only add the event listener if the menu is open
    if (profileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    // Clean up the event listener
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [profileMenuOpen]);

  const handleLogout = async () => {
    try {
      setProfileMenuOpen(false); // Close the profile menu
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/marketplace?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  // Auth modal handlers
  const openSignIn = () => {
    setAuthMode('signin');
    setAuthModalOpen(true);
  };

  const openSignUp = () => {
    setAuthMode('signup');
    setAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setAuthModalOpen(false);
  };

  // Featured hand tool categories shown directly in the nav bar
  const primaryCategoryNames = ['Hand Planes', 'Chisels', 'Hand Saws', 'Sharpening'];

  const primaryCategories = primaryCategoryNames
    .filter(name => toolCategories.includes(name))
    .map(name => ({
      name,
      subcategories: toolSubcategories[name] || []
    }));

  // Remaining categories grouped under "More"
  const moreCategories = toolCategories
    .filter(name => !primaryCategoryNames.includes(name) && name !== 'Other')
    .map(name => ({
      name,
      subcategories: toolSubcategories[name] || []
    }));

  // All categories for mobile menu
  const allCategories = toolCategories
    .filter(name => name !== 'Other')
    .map(name => ({
      name,
      subcategories: toolSubcategories[name] || []
    }));

  return (
    <header className="border-b shadow-sm">
      {/* Primary Header - Tall section with logo, search, and key actions */}
      <div className="bg-dark-teal border-b border-dark">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center">
          {/* Mobile menu button */}
          <button
            className="mr-4 lg:hidden text-bone"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu"
          >
            <Menu className="h-6 w-6" />
          </button>

          {/* Logo */}
          <div className="mr-6 flex-shrink-0">
            <Link to="/" className="font-display font-black text-bone" style={{ fontSize: '20px', letterSpacing: '-1.5px' }}>Rekerf</Link>
          </div>

          {/* Search bar - centered and expanded */}
          <div className="hidden md:flex flex-1 max-w-3xl">
            <form onSubmit={handleSearch} className="w-full relative">
              <input
                type="text"
                placeholder="Search for tools, brands, or categories..."
                className="w-full pl-10 pr-14 py-2.5 border border-dark rounded-md focus:outline-none focus:border-spruce shadow-sm bg-bone text-dark-teal"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-secondary" />
              <button
                type="submit"
                className="absolute right-0 top-0 w-12 h-full border-l border-dark flex items-center justify-center hover:bg-bone"
                aria-label="Search"
              >
                <Search className="h-5 w-5 text-spruce" />
              </button>
            </form>
          </div>

          {/* Right side - key actions section */}
          <div className="ml-auto flex items-center gap-6">
            {isAuthenticated() ? (
              // Authenticated user options
              <>
                {/* Sell your tools button */}
                <Link
                  to={user?.isSeller || user?.profile?.isSeller ? "/seller/dashboard" : "/sell"}
                  className="hidden md:flex items-center px-3 py-1.5 bg-honey text-dark-teal rounded-md hover:bg-honey/90 font-body font-medium whitespace-nowrap ml-4"
                >
                  <Hammer className="h-4 w-4 mr-1.5" />
                  Sell Your Tools
                </Link>

                {/* Cart Icon */}
                <CartIcon />

                {/* Wishlist icon */}
                <Link to="/wishlist" className="hidden md:flex text-secondary hover:text-bone relative" aria-label="Wishlist">
                  <Heart className="h-5 w-5" />
                  {wishlistCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-honey text-dark-teal text-xs rounded-full h-4 w-4 flex items-center justify-center">
                      {wishlistCount > 9 ? '9+' : wishlistCount}
                    </span>
                  )}
                </Link>

                {/* Messages Icon with notifications */}
                <Link to="/messages" className="hidden md:flex text-secondary hover:text-bone relative" aria-label="Messages">
                  <MessageSquare className="h-5 w-5" />
                  {(notificationCount > 0 || messageCount > 0) && (
                    <span className="absolute -top-1 -right-1 bg-honey text-dark-teal text-xs rounded-full h-4 w-4 flex items-center justify-center">
                      {(notificationCount + messageCount) > 9 ? '9+' : (notificationCount + messageCount)}
                    </span>
                  )}
                </Link>

                {/* User Profile Dropdown - Hide on mobile */}
                <div className="relative hidden md:block">
                  <button
                    className="flex items-center gap-1 text-secondary hover:text-bone"
                    onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                    aria-label="Open user menu"
                    aria-expanded={profileMenuOpen}
                    aria-haspopup="true"
                  >
                    {user?.photoURL ? (
                      // User has a profile image - display it
                      <div className="w-8 h-8 rounded-full overflow-hidden border border-dark">
                        <img
                          src={user.photoURL}
                          alt="Profile"
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ) : (
                      // No profile image - show default icon
                      <div className="w-8 h-8 rounded-full bg-spruce-light flex items-center justify-center">
                        <User className="h-4 w-4 text-bone" />
                      </div>
                    )}
                    <ChevronDown className="h-3 w-3 hidden md:block" />
                  </button>

                  {profileMenuOpen && (
                    <div
                      ref={profileMenuRef}
                      id="profile-dropdown"
                      className="absolute right-0 top-full mt-1 bg-bone-light shadow-lg rounded-md p-2 min-w-[220px] z-[100]"
                    >
                      {/* User info header */}
                      <div className="px-4 py-3 border-b">
                        <div className="flex items-center gap-3">
                          {user?.photoURL ? (
                            <div className="w-10 h-10 rounded-full overflow-hidden border border-dark">
                              <img
                                src={user.photoURL}
                                alt="Profile"
                                className="h-full w-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-spruce-light flex items-center justify-center">
                              <User className="h-5 w-5 text-bone" />
                            </div>
                          )}
                          <div>
                            <div className="font-body font-medium text-dark-teal">{user?.displayName || 'User'}</div>
                            <div className="text-xs text-secondary">{user?.email}</div>
                          </div>
                        </div>
                      </div>

                      {/* Main Account Options */}
                      <div className="py-1">
                        <Link to="/settings?tab=profile" className="flex items-center gap-3 w-full text-left px-4 py-2 text-dark-teal hover:bg-spruce-light hover:text-bone text-sm font-body">
                          <User className="h-4 w-4" />
                          My Account
                        </Link>

                        <Link to="/wishlist" className="flex items-center gap-3 w-full text-left px-4 py-2 text-dark-teal hover:bg-spruce-light hover:text-bone text-sm font-body">
                          <Heart className="h-4 w-4" />
                          Saved Tools
                        </Link>

                        <Link to="/messages" className="flex items-center gap-3 w-full text-left px-4 py-2 text-dark-teal hover:bg-spruce-light hover:text-bone text-sm font-body">
                          <div className="relative">
                            <MessageSquare className="h-4 w-4" />
                            {(notificationCount > 0 || messageCount > 0) && (
                              <span className="absolute -top-1 -right-1 bg-honey text-dark-teal text-xs rounded-full h-3.5 w-3.5 flex items-center justify-center text-[0.6rem]">
                                {(notificationCount + messageCount) > 9 ? '9+' : (notificationCount + messageCount)}
                              </span>
                            )}
                          </div>
                          Messages
                        </Link>
                      </div>

                      {/* Purchase Activity Section */}
                      <div className="border-t my-1 pt-1">
                        <div className="px-4 py-1">
                          <span className="text-xs font-body font-medium text-secondary">BUYING</span>
                        </div>
                        <Link to="/orders" className="flex items-center gap-3 w-full text-left px-4 py-2 text-dark-teal hover:bg-spruce-light hover:text-bone text-sm font-body">
                          <Package className="h-4 w-4" />
                          Purchases
                        </Link>
                      </div>

                      {/* Seller Section - Conditionally rendered */}
                      <div className="border-t my-1 pt-1">
                        <div className="px-4 py-1">
                          <span className="text-xs font-body font-medium text-secondary">SELLING</span>
                        </div>

                        {user?.isSeller || user?.profile?.isSeller ? (
                          <>
                            <Link to="/my-listings" className="flex items-center gap-3 w-full text-left px-4 py-2 text-dark-teal hover:bg-spruce-light hover:text-bone text-sm font-body">
                              <List className="h-4 w-4" />
                              My Tools
                            </Link>
                            <Link to="/seller/dashboard" className="flex items-center gap-3 w-full text-left px-4 py-2 text-dark-teal hover:bg-spruce-light hover:text-bone text-sm font-body">
                              <Package className="h-4 w-4" />
                              Seller Dashboard
                            </Link>
                          </>
                        ) : (
                          <Link to="/sell" className="flex items-center gap-3 w-full text-left px-4 py-2 text-dark-teal hover:bg-spruce-light hover:text-bone text-sm font-body">
                            <Store className="h-4 w-4" />
                            Become a Seller
                          </Link>
                        )}
                      </div>

                      {/* Settings and Logout */}
                      <div className="border-t my-1 pt-1">
                        <Link to="/settings" className="flex items-center gap-3 w-full text-left px-4 py-2 text-dark-teal hover:bg-spruce-light hover:text-bone text-sm font-body">
                          <Settings className="h-4 w-4" />
                          Settings
                        </Link>

                        <button
                          onClick={handleLogout}
                          className="flex items-center gap-3 w-full text-left px-4 py-2 text-dark-teal hover:bg-spruce-light hover:text-bone text-sm font-body"
                        >
                          <LogOut className="h-4 w-4" />
                          Sign Out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              // Unauthenticated user options
              <>
                {/* Sell your tools button */}
                <Link
                  to="/sell"
                  className="hidden md:flex items-center px-3 py-1.5 bg-honey text-dark-teal rounded-md hover:bg-honey/90 font-body font-medium whitespace-nowrap"
                >
                  <Hammer className="h-4 w-4 mr-1.5" />
                  Sell Your Tools
                </Link>

                {/* Cart Icon - right aligned */}
                <CartIcon />

                {/* Login link - text only */}
                <button
                  onClick={openSignIn}
                  className="text-secondary hover:text-bone text-sm font-body font-medium whitespace-nowrap hidden md:block"
                >
                  Log In
                </button>

                {/* Sign Up link - text only */}
                <button
                  onClick={openSignUp}
                  className="hidden md:block text-bone hover:text-honey text-sm font-body font-medium whitespace-nowrap"
                >
                  Sign Up
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Secondary Header - Categories and utility links (hidden on mobile) */}
      <div className="bg-dark-teal hidden lg:block border-t border-dark">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between h-10 items-center">
            {/* Left side - Category links */}
            <nav className="flex items-center gap-6 font-body" style={{ fontSize: '13px' }}>
              <Link
                to="/marketplace"
                className="text-secondary hover:text-bone whitespace-nowrap font-medium"
              >
                Browse All
              </Link>

              {primaryCategories.map((category) => (
                <div key={category.name} className="relative group">
                  <Link
                    to={`/marketplace?category=${encodeURIComponent(category.name)}`}
                    className="flex items-center gap-1 text-secondary hover:text-bone whitespace-nowrap"
                  >
                    {category.name} <ChevronDown className="h-3 w-3" />
                  </Link>
                  <div className="absolute left-0 top-full mt-1 bg-bone-light shadow-lg rounded-md p-2 min-w-[200px] hidden group-hover:block z-10">
                    {category.subcategories.map((sub) => (
                      <Link
                        key={sub}
                        to={`/marketplace?category=${encodeURIComponent(category.name)}&subcategory=${encodeURIComponent(sub)}`}
                        className="block px-4 py-2 text-sm text-dark-teal hover:bg-spruce-light hover:text-bone rounded-md font-body"
                      >
                        {sub}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}

              {/* More categories dropdown */}
              <div className="relative group">
                <button className="flex items-center gap-1 text-secondary hover:text-bone whitespace-nowrap">
                  More <ChevronDown className="h-3 w-3" />
                </button>
                <div className="absolute left-0 top-full mt-1 bg-bone-light shadow-lg rounded-md p-2 min-w-[220px] hidden group-hover:block z-10">
                  {moreCategories.map((category) => (
                    <Link
                      key={category.name}
                      to={`/marketplace?category=${encodeURIComponent(category.name)}`}
                      className="block px-4 py-2 text-sm text-dark-teal hover:bg-spruce-light hover:text-bone rounded-md font-body"
                    >
                      {category.name}
                    </Link>
                  ))}
                </div>
              </div>
            </nav>

            {/* Right side - Utility links */}
            <div className="flex items-center gap-6 font-body" style={{ fontSize: '13px' }}>
              <Link to="/scan" className="text-honey hover:text-honey-light font-medium">ToolScan</Link>
              <Link to="/help" className="text-secondary hover:text-bone">Help</Link>
              <Link to="/about" className="text-secondary hover:text-bone">About</Link>
              <a
                href="https://blog.rekerf.com/blog"
                target="_blank"
                rel="noopener noreferrer"
                className="text-secondary hover:text-bone"
              >
                Updates
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Search - Visible on small screens */}
      <div className="md:hidden border-t border-dark p-4 bg-dark-teal">
        <form onSubmit={handleSearch} className="relative">
          <input
            type="text"
            placeholder="Search for tools..."
            className="w-full pl-10 pr-14 py-2.5 border border-dark rounded-md focus:outline-none focus:border-spruce shadow-sm bg-bone text-dark-teal"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-secondary" />
          <button
            type="submit"
            className="absolute right-0 top-0 w-12 h-full border-l border-dark flex items-center justify-center hover:bg-bone"
            aria-label="Search"
          >
            <Search className="h-5 w-5 text-spruce" />
          </button>
        </form>
      </div>

      {/* Mobile Menu - Slides in from the left */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-dark-teal bg-opacity-50"
            onClick={() => setIsMenuOpen(false)}
          ></div>

          <div className="absolute inset-y-0 left-0 w-72 bg-bone shadow-lg p-5 overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <span className="text-xl font-display font-medium text-dark-teal">Menu</span>
              <button
                onClick={() => setIsMenuOpen(false)}
                className="text-dark-teal"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Mobile Categories with updated links */}
            <div className="space-y-4">
              <Link
                to="/marketplace"
                className="font-body font-medium text-dark-teal block hover:text-spruce py-2"
                onClick={() => setIsMenuOpen(false)}
              >
                Browse All Tools
              </Link>

              {allCategories.map((category) => (
                <div key={category.name} className="space-y-2">
                  <Link
                    to={`/marketplace?category=${encodeURIComponent(category.name)}`}
                    className="font-body font-medium text-dark-teal block hover:text-spruce py-2"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {category.name}
                  </Link>
                  {category.subcategories.length > 0 && (
                    <div className="pl-4 space-y-2">
                      {category.subcategories.map((sub) => (
                        <Link
                          key={sub}
                          to={`/marketplace?category=${encodeURIComponent(category.name)}&subcategory=${encodeURIComponent(sub)}`}
                          className="block text-dark-teal hover:text-spruce py-1 font-body"
                          onClick={() => setIsMenuOpen(false)}
                        >
                          {sub}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Mobile Sell link */}
            <div className="mt-6 mb-6 pt-4 border-t border-dark">
              <Link
                to="/sell"
                className="flex items-center gap-3 px-4 py-3 bg-honey text-dark-teal rounded-md font-body font-medium mb-4"
                onClick={() => setIsMenuOpen(false)}
              >
                <Hammer className="h-5 w-5" />
                Sell Your Tools
              </Link>
            </div>

            {/* Mobile User Links - Organized into sections */}
            <div className="mb-6">
              {isAuthenticated() ? (
                // Logged in mobile links with organized sections
                <>
                  {/* Main Account Options */}
                  <div className="mb-4">
                    <div className="px-3 py-1 text-xs font-body font-medium text-secondary">
                      ACCOUNT
                    </div>
                    <Link
                      to="/settings?tab=profile"
                      className="flex items-center gap-3 py-3 px-3 text-dark-teal hover:text-spruce rounded-md font-body"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      {user?.photoURL ? (
                        <div className="w-7 h-7 rounded-full overflow-hidden border border-dark flex-shrink-0">
                          <img
                            src={user.photoURL}
                            alt="Profile"
                            className="h-full w-full object-cover"
                          />
                        </div>
                      ) : (
                        <User className="h-5 w-5" />
                      )}
                      My Account
                    </Link>
                    <Link
                      to="/wishlist"
                      className="flex items-center gap-3 py-3 px-3 text-dark-teal hover:text-spruce rounded-md font-body"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <Heart className="h-5 w-5" />
                      Saved Tools
                    </Link>
                    <Link
                      to="/messages"
                      className="flex items-center gap-3 py-3 px-3 text-dark-teal hover:text-spruce rounded-md font-body"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <div className="relative">
                        <MessageSquare className="h-5 w-5" />
                        {notificationCount > 0 && (
                          <span className="absolute -top-1 -right-1 bg-honey text-dark-teal text-xs rounded-full h-4 w-4 flex items-center justify-center">
                            {notificationCount > 9 ? '9+' : notificationCount}
                          </span>
                        )}
                      </div>
                      Messages
                    </Link>
                    <Link
                      to="/cart"
                      className="flex items-center gap-3 py-3 px-3 text-dark-teal hover:text-spruce rounded-md font-body"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <ShoppingCart className="h-5 w-5" />
                      Cart
                    </Link>
                  </div>

                  {/* Purchase Activity Section */}
                  <div className="mb-4 border-t border-dark pt-2">
                    <div className="px-3 py-1 text-xs font-body font-medium text-secondary">
                      BUYING
                    </div>
                    <Link
                      to="/orders"
                      className="flex items-center gap-3 py-3 px-3 text-dark-teal hover:text-spruce rounded-md font-body"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <Package className="h-5 w-5" />
                      Purchases
                    </Link>
                  </div>

                  {/* Seller Section */}
                  <div className="mb-4 border-t border-dark pt-2">
                    <div className="px-3 py-1 text-xs font-body font-medium text-secondary">
                      SELLING
                    </div>

                    {user?.isSeller || user?.profile?.isSeller ? (
                      <>
                        <Link
                          to="/my-listings"
                          className="flex items-center gap-3 py-3 px-3 text-dark-teal hover:text-spruce rounded-md font-body"
                          onClick={() => setIsMenuOpen(false)}
                        >
                          <List className="h-5 w-5" />
                          My Tools
                        </Link>
                        <Link
                          to="/seller/dashboard"
                          className="flex items-center gap-3 py-3 px-3 text-dark-teal hover:text-spruce rounded-md font-body"
                          onClick={() => setIsMenuOpen(false)}
                        >
                          <Package className="h-5 w-5" />
                          Seller Dashboard
                        </Link>
                      </>
                    ) : (
                      <Link
                        to="/sell"
                        className="flex items-center gap-3 py-3 px-3 text-dark-teal hover:text-spruce rounded-md font-body"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <Store className="h-5 w-5" />
                        Become a Seller
                      </Link>
                    )}
                  </div>

                  {/* Settings and Sign Out */}
                  <div className="border-t border-dark pt-2">
                    <div className="px-3 py-1 text-xs font-body font-medium text-secondary">
                      SETTINGS
                    </div>
                    <Link
                      to="/settings"
                      className="flex items-center gap-3 py-3 px-3 text-dark-teal hover:text-spruce rounded-md font-body"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <Settings className="h-5 w-5" />
                      Settings
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-3 py-3 px-3 text-dark-teal hover:text-spruce rounded-md w-full text-left font-body"
                    >
                      <LogOut className="h-5 w-5" />
                      Sign Out
                    </button>
                  </div>
                </>
              ) : (
                // Logged out mobile links
                <>
                  <Link
                    to="/cart"
                    className="flex items-center gap-3 py-3 px-3 text-dark-teal hover:text-spruce rounded-md font-body"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <ShoppingCart className="h-5 w-5" />
                    Cart
                  </Link>
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      openSignIn();
                    }}
                    className="flex items-center gap-3 py-3 px-3 text-dark-teal hover:text-spruce rounded-md w-full text-left font-body"
                  >
                    <User className="h-5 w-5" />
                    Log In
                  </button>
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      openSignUp();
                    }}
                    className="flex items-center gap-3 py-3 px-3 bg-spruce text-bone rounded-md w-full text-left font-body"
                  >
                    <Plus className="h-5 w-5" />
                    Sign Up
                  </button>
                </>
              )}
            </div>

            {/* Mobile utility links */}
            <div className="border-t pt-4 border-dark">
              <Link
                to="/help"
                className="block py-2 text-dark-teal hover:text-spruce font-body"
                onClick={() => setIsMenuOpen(false)}
              >
                Help
              </Link>
              <Link
                to="/about"
                className="block py-2 text-dark-teal hover:text-spruce font-body"
                onClick={() => setIsMenuOpen(false)}
              >
                About
              </Link>
              <a
                href="https://blog.rekerf.com/blog"
                target="_blank"
                rel="noopener noreferrer"
                className="block py-2 text-dark-teal hover:text-spruce font-body"
                onClick={() => setIsMenuOpen(false)}
              >
                Updates
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={closeAuthModal}
        initialMode={authMode}
        title={authMode === 'signin' ? 'Sign In to Your Account' : 'Create Your Account'}
      />
    </header>
  );
};

export default Header;
