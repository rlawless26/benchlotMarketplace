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
  Bell,
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
import NotificationBadge from './NotificationBadge';
import AuthModal from './AuthModal';

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
  const { hasUnreadMessages, unreadCount: messageCount } = useMessages();
  
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

  const categories = [
    {
      name: "Power Tools",
      subcategories: ["Table Saws", "Drills", "Sanders", "Routers", "Air Compressors"]
    },
    {
      name: "Hand Tools",
      subcategories: ["Planes", "Chisels", "Hammers", "Screwdrivers", "Wrenches"]
    },
    {
      name: "Workshop Equipment",
      subcategories: ["Dust Collection", "Work Benches", "Tool Storage", "Safety Equipment"]
    },
    {
      name: "Machinery",
      subcategories: ["Lathes", "Mills", "Band Saws", "Drill Presses", "CNC"]
    }
  ];

  return (
    <header className="border-b shadow-sm">
      {/* Primary Header - Tall section with logo, search, and key actions */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center">
          {/* Mobile menu button */}
          <button
            className="mr-4 lg:hidden text-stone-700"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu"
          >
            <Menu className="h-6 w-6" />
          </button>

          {/* Logo */}
          <div className="mr-6 flex-shrink-0">
            <Link to="/" className="text-2xl font-serif text-benchlot-primary">Benchlot</Link>
          </div>

          {/* Search bar - centered and expanded */}
          <div className="hidden md:flex flex-1 max-w-3xl">
            <form onSubmit={handleSearch} className="w-full relative">
              <input
                type="text"
                placeholder="Search for tools, brands, or categories..."
                className="w-full pl-10 pr-14 py-2.5 border border-stone-300 rounded-md focus:outline-none focus:border-benchlot-primary shadow-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-stone-400" />
              <button 
                type="submit"
                className="absolute right-0 top-0 w-12 h-full border-l border-stone-300 flex items-center justify-center hover:bg-stone-50"
                aria-label="Search"
              >
                <Search className="h-5 w-5 text-benchlot-primary" />
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
                  className="hidden md:flex items-center px-3 py-1.5 bg-white text-benchlot-primary border border-benchlot-primary rounded-md hover:bg-stone-50 font-medium whitespace-nowrap"
                >
                  <Hammer className="h-4 w-4 mr-1.5" />
                  Sell Your Tools
                </Link>
                
                {/* Cart Icon */}
                <CartIcon />
                
                {/* Wishlist icon */}
                <Link to="/wishlist" className="hidden md:flex text-stone-700 hover:text-benchlot-primary relative" aria-label="Wishlist">
                  <Heart className="h-5 w-5" />
                  {wishlistCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-benchlot-primary text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                      {wishlistCount > 9 ? '9+' : wishlistCount}
                    </span>
                  )}
                </Link>
                
                {/* Messages Icon with notifications */}
                <Link to="/messages" className="hidden md:flex text-stone-700 hover:text-benchlot-primary relative" aria-label="Messages">
                  <MessageSquare className="h-5 w-5" />
                  {(notificationCount > 0 || messageCount > 0) && (
                    <span className="absolute -top-1 -right-1 bg-benchlot-primary text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                      {(notificationCount + messageCount) > 9 ? '9+' : (notificationCount + messageCount)}
                    </span>
                  )}
                </Link>
                
                {/* User Profile Dropdown - Hide on mobile */}
                <div className="relative hidden md:block">
                  <button
                    className="flex items-center gap-1 text-stone-700 hover:text-benchlot-primary"
                    onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                    aria-label="Open user menu"
                    aria-expanded={profileMenuOpen}
                    aria-haspopup="true"
                  >
                    {user?.photoURL ? (
                      // User has a profile image - display it
                      <div className="w-8 h-8 rounded-full overflow-hidden border border-stone-200">
                        <img
                          src={user.photoURL}
                          alt="Profile"
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ) : (
                      // No profile image - show default icon
                      <div className="w-8 h-8 rounded-full bg-benchlot-accent-light flex items-center justify-center">
                        <User className="h-4 w-4 text-benchlot-primary" />
                      </div>
                    )}
                    <ChevronDown className="h-3 w-3 hidden md:block" />
                  </button>

                  {profileMenuOpen && (
                    <div 
                      ref={profileMenuRef} 
                      id="profile-dropdown"
                      className="absolute right-0 top-full mt-1 bg-white shadow-lg rounded-md p-2 min-w-[220px] z-[100]"
                    >
                      {/* User info header */}
                      <div className="px-4 py-3 border-b">
                        <div className="flex items-center gap-3">
                          {user?.photoURL ? (
                            <div className="w-10 h-10 rounded-full overflow-hidden border border-stone-200">
                              <img
                                src={user.photoURL}
                                alt="Profile"
                                className="h-full w-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-benchlot-accent-light flex items-center justify-center">
                              <User className="h-5 w-5 text-benchlot-primary" />
                            </div>
                          )}
                          <div>
                            <div className="font-medium text-stone-800">{user?.displayName || 'User'}</div>
                            <div className="text-xs text-stone-500">{user?.email}</div>
                          </div>
                        </div>
                      </div>

                      {/* Main Account Options */}
                      <div className="py-1">
                        <Link to="/settings?tab=profile" className="flex items-center gap-3 w-full text-left px-4 py-2 text-stone-700 hover:bg-benchlot-accent-light hover:text-benchlot-primary text-sm">
                          <User className="h-4 w-4" />
                          My Account
                        </Link>

                        <Link to="/wishlist" className="flex items-center gap-3 w-full text-left px-4 py-2 text-stone-700 hover:bg-benchlot-accent-light hover:text-benchlot-primary text-sm">
                          <Heart className="h-4 w-4" />
                          Saved Tools
                        </Link>

                        <Link to="/messages" className="flex items-center gap-3 w-full text-left px-4 py-2 text-stone-700 hover:bg-benchlot-accent-light hover:text-benchlot-primary text-sm">
                          <div className="relative">
                            <MessageSquare className="h-4 w-4" />
                            {(notificationCount > 0 || messageCount > 0) && (
                              <span className="absolute -top-1 -right-1 bg-benchlot-primary text-white text-xs rounded-full h-3.5 w-3.5 flex items-center justify-center text-[0.6rem]">
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
                          <span className="text-xs font-medium text-stone-500">PURCHASES</span>
                        </div>
                        <Link to="/orders" className="flex items-center gap-3 w-full text-left px-4 py-2 text-stone-700 hover:bg-benchlot-accent-light hover:text-benchlot-primary text-sm">
                          <Package className="h-4 w-4" />
                          My Orders
                        </Link>
                      </div>

                      {/* Seller Section - Conditionally rendered */}
                      <div className="border-t my-1 pt-1">
                        <div className="px-4 py-1">
                          <span className="text-xs font-medium text-stone-500">SELLING</span>
                        </div>
                        
                        {user?.isSeller || user?.profile?.isSeller ? (
                          <>
                            <Link to="/my-listings" className="flex items-center gap-3 w-full text-left px-4 py-2 text-stone-700 hover:bg-benchlot-accent-light hover:text-benchlot-primary text-sm">
                              <List className="h-4 w-4" />
                              My Tools
                            </Link>
                            <Link to="/seller/dashboard" className="flex items-center gap-3 w-full text-left px-4 py-2 text-stone-700 hover:bg-benchlot-accent-light hover:text-benchlot-primary text-sm">
                              <Package className="h-4 w-4" />
                              Seller Dashboard
                            </Link>
                          </>
                        ) : (
                          <Link to="/sell" className="flex items-center gap-3 w-full text-left px-4 py-2 text-stone-700 hover:bg-benchlot-accent-light hover:text-benchlot-primary text-sm">
                            <Store className="h-4 w-4" />
                            Become a Seller
                          </Link>
                        )}
                      </div>

                      {/* Settings and Logout */}
                      <div className="border-t my-1 pt-1">
                        <Link to="/settings" className="flex items-center gap-3 w-full text-left px-4 py-2 text-stone-700 hover:bg-benchlot-accent-light hover:text-benchlot-primary text-sm">
                          <Settings className="h-4 w-4" />
                          Settings
                        </Link>
                        
                        <button
                          onClick={handleLogout}
                          className="flex items-center gap-3 w-full text-left px-4 py-2 text-stone-700 hover:bg-benchlot-accent-light hover:text-benchlot-primary text-sm"
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
                  className="hidden md:flex items-center px-3 py-1.5 bg-white text-benchlot-primary border border-benchlot-primary rounded-md hover:bg-stone-50 font-medium whitespace-nowrap"
                >
                  <Hammer className="h-4 w-4 mr-1.5" />
                  Sell Your Tools
                </Link>
                
                {/* Cart Icon - right aligned */}
                <CartIcon />
                
                {/* Login link - text only */}
                <button 
                  onClick={openSignIn}
                  className="text-stone-700 hover:text-benchlot-primary text-sm font-medium whitespace-nowrap hidden md:block"
                >
                  Log In
                </button>
                
                {/* Sign Up link - text only */}
                <button
                  onClick={openSignUp}
                  className="hidden md:block text-benchlot-primary hover:text-benchlot-secondary text-sm font-medium whitespace-nowrap"
                >
                  Sign Up
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Secondary Header - Categories and utility links (hidden on mobile) */}
      <div className="bg-white hidden lg:block">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between h-10 items-center">
            {/* Left side - Category links */}
            <nav className="flex items-center gap-6 text-sm">
              <Link
                to="/marketplace"
                className="text-stone-700 hover:text-benchlot-primary whitespace-nowrap font-medium"
              >
                Browse All
              </Link>

              <Link
                to="/categories"
                className="text-stone-700 hover:text-benchlot-primary whitespace-nowrap font-medium"
              >
                All Categories
              </Link>
              
              {categories.map((category) => (
                <div key={category.name} className="relative group">
                  <Link 
                    to={`/marketplace?category=${encodeURIComponent(category.name)}`}
                    className="flex items-center gap-1 text-stone-700 hover:text-benchlot-primary whitespace-nowrap"
                  >
                    {category.name} <ChevronDown className="h-3 w-3" />
                  </Link>
                  <div className="absolute left-0 top-full mt-1 bg-white shadow-lg rounded-md p-2 min-w-[200px] hidden group-hover:block z-10">
                    {category.subcategories.map((sub) => (
                      <Link
                        key={sub}
                        to={`/marketplace?category=${encodeURIComponent(category.name)}&subcategory=${encodeURIComponent(sub)}`}
                        className="block px-4 py-2 text-sm text-stone-700 hover:bg-benchlot-accent-light hover:text-benchlot-primary rounded-md"
                      >
                        {sub}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </nav>

            {/* Right side - Utility links */}
            <div className="flex items-center gap-6 text-sm">
              <Link to="/help" className="text-stone-700 hover:text-benchlot-primary">Help</Link>
              <Link to="/about" className="text-stone-700 hover:text-benchlot-primary">About</Link>
              <a 
                href="https://blog.benchlot.com" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-stone-700 hover:text-benchlot-primary"
              >
                Updates
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Search - Visible on small screens */}
      <div className="md:hidden border-t p-4">
        <form onSubmit={handleSearch} className="relative">
          <input
            type="text"
            placeholder="Search for tools..."
            className="w-full pl-10 pr-14 py-2.5 border border-stone-300 rounded-md focus:outline-none focus:border-benchlot-primary shadow-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-stone-400" />
          <button 
            type="submit"
            className="absolute right-0 top-0 w-12 h-full border-l border-stone-300 flex items-center justify-center hover:bg-stone-50"
            aria-label="Search"
          >
            <Search className="h-5 w-5 text-benchlot-primary" />
          </button>
        </form>
      </div>

      {/* Mobile Menu - Slides in from the left */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-stone-900 bg-opacity-50"
            onClick={() => setIsMenuOpen(false)}
          ></div>

          <div className="absolute inset-y-0 left-0 w-72 bg-white shadow-lg p-5 overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <span className="text-xl font-serif font-medium">Menu</span>
              <button
                onClick={() => setIsMenuOpen(false)}
                className="text-stone-700"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Mobile Categories with updated links */}
            <div className="space-y-4">
              <Link 
                to="/marketplace"
                className="font-medium text-stone-800 block hover:text-benchlot-primary py-2"
                onClick={() => setIsMenuOpen(false)}
              >
                Browse All Tools
              </Link>
              
              <Link 
                to="/categories"
                className="font-medium text-stone-800 block hover:text-benchlot-primary py-2"
                onClick={() => setIsMenuOpen(false)}
              >
                All Categories
              </Link>
              
              {categories.map((category) => (
                <div key={category.name} className="space-y-2">
                  <Link 
                    to={`/marketplace?category=${encodeURIComponent(category.name)}`}
                    className="font-medium text-stone-800 block hover:text-benchlot-primary py-2"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {category.name}
                  </Link>
                  <div className="pl-4 space-y-2">
                    {category.subcategories.map((sub) => (
                      <Link
                        key={sub}
                        to={`/marketplace?category=${encodeURIComponent(category.name)}&subcategory=${encodeURIComponent(sub)}`}
                        className="block text-stone-700 hover:text-benchlot-primary py-1"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        {sub}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Mobile Sell link */}
            <div className="mt-6 mb-6 pt-4 border-t border-stone-200">
              <Link 
                to={isAuthenticated() ? "/seller/tools/new" : "/sell"}
                className="flex items-center gap-3 px-4 py-3 bg-benchlot-accent text-benchlot-primary rounded-md font-medium mb-4"
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
                    <div className="px-3 py-1 text-xs font-medium text-stone-500">
                      ACCOUNT
                    </div>
                    <Link 
                      to="/settings?tab=profile" 
                      className="flex items-center gap-3 py-3 px-3 text-stone-700 hover:text-benchlot-primary rounded-md"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      {user?.photoURL ? (
                        <div className="w-7 h-7 rounded-full overflow-hidden border border-stone-200 flex-shrink-0">
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
                      className="flex items-center gap-3 py-3 px-3 text-stone-700 hover:text-benchlot-primary rounded-md"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <Heart className="h-5 w-5" />
                      Saved Tools
                    </Link>
                    <Link 
                      to="/messages" 
                      className="flex items-center gap-3 py-3 px-3 text-stone-700 hover:text-benchlot-primary rounded-md"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <div className="relative">
                        <MessageSquare className="h-5 w-5" />
                        {notificationCount > 0 && (
                          <span className="absolute -top-1 -right-1 bg-benchlot-primary text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                            {notificationCount > 9 ? '9+' : notificationCount}
                          </span>
                        )}
                      </div>
                      Messages
                    </Link>
                    <Link 
                      to="/cart" 
                      className="flex items-center gap-3 py-3 px-3 text-stone-700 hover:text-benchlot-primary rounded-md"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <ShoppingCart className="h-5 w-5" />
                      Cart
                    </Link>
                  </div>

                  {/* Purchase Activity Section */}
                  <div className="mb-4 border-t border-stone-100 pt-2">
                    <div className="px-3 py-1 text-xs font-medium text-stone-500">
                      PURCHASES
                    </div>
                    <Link 
                      to="/orders" 
                      className="flex items-center gap-3 py-3 px-3 text-stone-700 hover:text-benchlot-primary rounded-md"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <Package className="h-5 w-5" />
                      My Orders
                    </Link>
                  </div>

                  {/* Seller Section */}
                  <div className="mb-4 border-t border-stone-100 pt-2">
                    <div className="px-3 py-1 text-xs font-medium text-stone-500">
                      SELLING
                    </div>
                    
                    {user?.isSeller || user?.profile?.isSeller ? (
                      <>
                        <Link 
                          to="/my-listings" 
                          className="flex items-center gap-3 py-3 px-3 text-stone-700 hover:text-benchlot-primary rounded-md"
                          onClick={() => setIsMenuOpen(false)}
                        >
                          <List className="h-5 w-5" />
                          My Tools
                        </Link>
                        <Link 
                          to="/seller/dashboard" 
                          className="flex items-center gap-3 py-3 px-3 text-stone-700 hover:text-benchlot-primary rounded-md"
                          onClick={() => setIsMenuOpen(false)}
                        >
                          <Package className="h-5 w-5" />
                          Seller Dashboard
                        </Link>
                      </>
                    ) : (
                      <Link 
                        to="/sell" 
                        className="flex items-center gap-3 py-3 px-3 text-stone-700 hover:text-benchlot-primary rounded-md"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <Store className="h-5 w-5" />
                        Become a Seller
                      </Link>
                    )}
                  </div>

                  {/* Settings and Sign Out */}
                  <div className="border-t border-stone-100 pt-2">
                    <div className="px-3 py-1 text-xs font-medium text-stone-500">
                      SETTINGS
                    </div>
                    <Link 
                      to="/settings" 
                      className="flex items-center gap-3 py-3 px-3 text-stone-700 hover:text-benchlot-primary rounded-md"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <Settings className="h-5 w-5" />
                      Settings
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-3 py-3 px-3 text-stone-700 hover:text-benchlot-primary rounded-md w-full text-left"
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
                    className="flex items-center gap-3 py-3 px-3 text-stone-700 hover:text-benchlot-primary rounded-md"
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
                    className="flex items-center gap-3 py-3 px-3 text-stone-700 hover:text-benchlot-primary rounded-md w-full text-left"
                  >
                    <User className="h-5 w-5" />
                    Log In
                  </button>
                  <button 
                    onClick={() => {
                      setIsMenuOpen(false);
                      openSignUp();
                    }}
                    className="flex items-center gap-3 py-3 px-3 bg-benchlot-primary text-white rounded-md w-full text-left"
                  >
                    <Plus className="h-5 w-5" />
                    Sign Up
                  </button>
                </>
              )}
            </div>

            {/* Mobile utility links */}
            <div className="border-t pt-4 border-stone-200">
              <Link 
                to="/help" 
                className="block py-2 text-stone-700 hover:text-benchlot-primary"
                onClick={() => setIsMenuOpen(false)}
              >
                Help
              </Link>
              <Link 
                to="/about" 
                className="block py-2 text-stone-700 hover:text-benchlot-primary"
                onClick={() => setIsMenuOpen(false)}
              >
                About
              </Link>
              <a 
                href="https://blog.benchlot.com" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="block py-2 text-stone-700 hover:text-benchlot-primary"
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