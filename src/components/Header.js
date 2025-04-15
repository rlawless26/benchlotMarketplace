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
  X
} from 'lucide-react';

// Import the useAuth hook from firebase
import { useAuth } from '../firebase/hooks/useAuth';

// Import cart components
import CartIcon from './CartIcon';

const Header = () => {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  
  // Use the auth hook to access user data
  const { user, isAuthenticated, signOut } = useAuth();
  
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
    <header className="border-b">
      {/* Top Bar */}
      <div className="border-b bg-white">
        <div className="max-w-7xl mx-auto px-4 h-8 flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <Link to="/about" className="hover:text-benchlot-primary">About</Link>
            <Link to="/help" className="hover:text-benchlot-primary">Help</Link>
          </div>
          <div className="flex items-center gap-4">
            {/* Empty for spacing */}
          </div>
        </div>
      </div>

      {/* Main Header */}
      <div className="bg-white">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* Left Section */}
          <div className="flex items-center gap-8">
            <button
              className="lg:hidden text-stone-700"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Toggle menu"
            >
              <Menu className="h-6 w-6" />
            </button>

            {/* Logo link */}
            <Link to="/" className="text-2xl font-serif text-benchlot-primary">Benchlot</Link>

            {/* Desktop Categories with links to marketplace with filters */}
            <nav className="hidden lg:flex items-center gap-4">
              <Link
                to="/marketplace"
                className="text-stone-700 hover:text-benchlot-primary text-sm whitespace-nowrap"
              >
                Browse All
              </Link>
              
              <Link
                to="/categories"
                className="text-stone-700 hover:text-benchlot-primary text-sm whitespace-nowrap"
              >
                All Categories
              </Link>
              
              {categories.map((category) => (
                <div key={category.name} className="relative group">
                  <Link 
                    to={`/marketplace?category=${encodeURIComponent(category.name)}`}
                    className="flex items-center gap-1 text-stone-700 hover:text-benchlot-primary text-sm whitespace-nowrap"
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
          </div>

          {/* Center - Search */}
          <div className="hidden md:flex flex-1 max-w-xl mx-8">
            <div className="relative w-full">
              <input
                type="text"
                placeholder="Search for tools..."
                className="w-full pl-10 pr-4 py-2 border border-stone-300 rounded-md focus:outline-none focus:border-benchlot-primary"
              />
              <Search className="absolute left-3 top-2.5 h-5 w-5 text-stone-400" />
            </div>
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-4">
            {isAuthenticated() ? (
              // Authenticated user options
              <>
                {/* Sell your gear button */}
                <Link 
                  to="/tools/new" 
                  className="text-benchlot-primary hover:bg-benchlot-accent-light inline-flex items-center px-3 py-1.5 border border-benchlot-primary rounded-md"
                >
                  <Hammer className="h-4 w-4 mr-1" />
                  <span className="hidden md:inline text-sm whitespace-nowrap">Sell your gear</span>
                </Link>
                
                {/* Wishlist icon */}
                <Link to="/wishlist" className="text-stone-700 hover:text-benchlot-primary">
                  <Heart className="h-4 w-4" />
                </Link>
                
                {/* Cart Icon */}
                <CartIcon />
                
                {/* Messages Icon */}
                <Link to="/messages" className="text-stone-700 hover:text-benchlot-primary">
                  <MessageSquare className="h-4 w-4" />
                </Link>
                
                {/* User Profile Dropdown */}
                <div className="relative">
                  <button
                    className="text-stone-700 hover:text-benchlot-primary hover:bg-benchlot-accent-light relative cursor-pointer p-1 rounded-full flex items-center justify-center"
                    onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                    aria-label="Open user menu"
                    aria-expanded={profileMenuOpen}
                    aria-haspopup="true"
                  >
                    <div className="w-8 h-8 rounded-full bg-benchlot-accent-light flex items-center justify-center">
                      <User className="h-4 w-4 text-benchlot-primary" />
                    </div>
                  </button>

                  {profileMenuOpen && (
                    <div 
                      ref={profileMenuRef} 
                      id="profile-dropdown"
                      className="absolute right-0 top-full mt-1 bg-white shadow-lg rounded-md p-2 min-w-[200px] z-[100]"
                    >
                      <div className="px-4 py-2 text-sm font-medium text-stone-700 border-b">
                        {user?.email || 'User'}
                      </div>

                      <Link to="/profile" className="flex items-center gap-3 w-full text-left px-4 py-2 text-stone-700 hover:bg-benchlot-accent-light hover:text-benchlot-primary text-sm">
                        <User className="h-4 w-4" />
                        View Profile
                      </Link>

                      <Link to="/my-listings" className="flex items-center gap-3 w-full text-left px-4 py-2 text-stone-700 hover:bg-benchlot-accent-light hover:text-benchlot-primary text-sm">
                        <List className="h-4 w-4" />
                        My Listings
                      </Link>
                      
                      <Link to="/dashboard" className="flex items-center gap-3 w-full text-left px-4 py-2 text-stone-700 hover:bg-benchlot-accent-light hover:text-benchlot-primary text-sm">
                        <Package className="h-4 w-4" />
                        Shop Dashboard
                      </Link>

                      <Link to="/wishlist" className="flex items-center gap-3 w-full text-left px-4 py-2 text-stone-700 hover:bg-benchlot-accent-light hover:text-benchlot-primary text-sm">
                        <Heart className="h-4 w-4" />
                        Saved Tools
                      </Link>

                      <Link to="/settings" className="flex items-center gap-3 w-full text-left px-4 py-2 text-stone-700 hover:bg-benchlot-accent-light hover:text-benchlot-primary text-sm">
                        <Settings className="h-4 w-4" />
                        Account Settings
                      </Link>

                      <div className="border-t my-1"></div>

                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 w-full text-left px-4 py-2 text-stone-700 hover:bg-benchlot-accent-light hover:text-benchlot-primary text-sm"
                      >
                        <LogOut className="h-4 w-4" />
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              // Unauthenticated user options
              <>
                <Link to="/tools/new" className="text-benchlot-primary hover:bg-benchlot-accent-light inline-flex items-center px-3 py-1.5 border border-benchlot-primary rounded-md">
                  <Hammer className="h-4 w-4 mr-1" />
                  <span className="hidden md:inline text-sm whitespace-nowrap">Sell your tools</span>
                </Link>
                
                {/* Cart Icon */}
                <CartIcon />
                
                <Link to="/login" className="text-stone-700 hover:text-benchlot-primary text-sm whitespace-nowrap">
                  Log In
                </Link>
                
                <Link
                  to="/login?signup=true"
                  className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-benchlot-primary hover:bg-benchlot-secondary text-white rounded-md text-sm whitespace-nowrap"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Search - Visible on small screens */}
      <div className="md:hidden border-t p-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Search for tools..."
            className="w-full pl-10 pr-4 py-2 border border-stone-300 rounded-md focus:outline-none focus:border-benchlot-primary"
          />
          <Search className="absolute left-3 top-2.5 h-5 w-5 text-stone-400" />
        </div>
      </div>

      {/* Mobile Menu - Slides in from the left */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-stone-900 bg-opacity-50"
            onClick={() => setIsMenuOpen(false)}
          ></div>

          <div className="absolute inset-y-0 left-0 w-64 bg-white shadow-lg p-5 overflow-y-auto">
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
              {categories.map((category) => (
                <div key={category.name} className="space-y-2">
                  <Link 
                    to={`/marketplace?category=${encodeURIComponent(category.name)}`}
                    className="font-medium text-stone-800 block hover:text-benchlot-primary"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {category.name}
                  </Link>
                  <div className="pl-4 space-y-2">
                    {category.subcategories.map((sub) => (
                      <Link
                        key={sub}
                        to={`/marketplace?category=${encodeURIComponent(category.name)}&subcategory=${encodeURIComponent(sub)}`}
                        className="block text-stone-700 hover:text-benchlot-primary"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        {sub}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Mobile User Links */}
            <div className="mt-8 pt-6 border-t border-stone-200">
              {isAuthenticated() ? (
                <div className="space-y-3">
                  <Link 
                    to="/cart" 
                    className="flex items-center gap-3 py-2 text-stone-700 hover:text-benchlot-primary"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <ShoppingCart className="h-5 w-5" />
                    Cart
                  </Link>
                  <Link 
                    to="/profile" 
                    className="flex items-center gap-3 py-2 text-stone-700 hover:text-benchlot-primary"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <User className="h-5 w-5" />
                    View Profile
                  </Link>
                  <Link 
                    to="/my-listings" 
                    className="flex items-center gap-3 py-2 text-stone-700 hover:text-benchlot-primary"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <List className="h-5 w-5" />
                    My Listings
                  </Link>
                  <Link 
                    to="/dashboard" 
                    className="flex items-center gap-3 py-2 text-stone-700 hover:text-benchlot-primary"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <Package className="h-5 w-5" />
                    Shop Dashboard
                  </Link>
                  <Link 
                    to="/wishlist" 
                    className="flex items-center gap-3 py-2 text-stone-700 hover:text-benchlot-primary"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <Heart className="h-5 w-5" />
                    Saved Tools
                  </Link>
                  <Link 
                    to="/tools/new"
                    className="flex items-center gap-3 py-2 px-3 text-benchlot-primary border border-benchlot-primary rounded-md hover:bg-benchlot-accent-light"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <Hammer className="h-5 w-5" />
                    Sell your gear
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 py-2 text-stone-700 hover:text-benchlot-primary"
                  >
                    <LogOut className="h-5 w-5" />
                    Sign Out
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <Link 
                    to="/tools/new" 
                    className="flex items-center gap-3 py-2 px-3 text-benchlot-primary border border-benchlot-primary rounded-md hover:bg-benchlot-accent-light"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <Hammer className="h-5 w-5" />
                    Sell your tools
                  </Link>
                  <Link 
                    to="/cart" 
                    className="flex items-center gap-3 py-2 text-stone-700 hover:text-benchlot-primary"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <ShoppingCart className="h-5 w-5" />
                    Cart
                  </Link>
                  <Link 
                    to="/login" 
                    className="block py-2 text-stone-700 hover:text-benchlot-primary"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Log In
                  </Link>
                  <Link 
                    to="/login?signup=true" 
                    className="block py-2 text-stone-700 hover:text-benchlot-primary"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Sign Up
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;