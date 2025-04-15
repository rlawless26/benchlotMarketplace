// src/components/Layout.js
import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../firebase';
import CartIcon from './CartIcon';
import Footer from './Footer';

const Layout = ({ children }) => {
  const { user, isAuthenticated, signOut } = useAuth();
  
  return (
    <div className="App min-h-screen flex flex-col bg-benchlot-base">
      <header className="main-header">
        <div className="header-content">
          <nav className="flex items-center justify-between w-full">
            {/* Logo and brand */}
            <div className="flex-shrink-0">
              <Link to="/" className="logo-container">
                <span className="logo">Benchlot</span>
              </Link>
            </div>
            
            {/* Main Navigation */}
            <div className="hidden md:block">
              <div className="nav-links">
                <Link to="/" className="nav-link">
                  Marketplace
                </Link>
                {isAuthenticated() && (
                  <>
                    <Link to="/my-listings" className="nav-link">
                      My Listings
                    </Link>
                    <Link to="/tools/new" className="nav-link">
                      Add Tool
                    </Link>
                  </>
                )}
              </div>
            </div>
            
            {/* Right side - Auth and Cart */}
            <div className="flex items-center space-x-4">
              {isAuthenticated() ? (
                <div className="relative group">
                  <button className="flex items-center text-benchlot-text-secondary hover:text-benchlot-primary focus:outline-none transition duration-200">
                    <span className="text-sm font-medium mr-1">{user?.email?.split('@')[0] || 'User'}</span>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {/* Dropdown menu */}
                  <div id="profile-dropdown" className="absolute right-0 mt-2 w-48 py-2 bg-white rounded-lg shadow-card z-20 hidden group-hover:block">
                    <Link to="/my-listings" className="block px-4 py-2 text-sm text-benchlot-text-secondary hover:text-benchlot-primary hover:bg-benchlot-accent-light">
                      My Listings
                    </Link>
                    <Link to="/profile" className="block px-4 py-2 text-sm text-benchlot-text-secondary hover:text-benchlot-primary hover:bg-benchlot-accent-light">
                      Profile
                    </Link>
                    <button
                      onClick={signOut}
                      className="block w-full text-left px-4 py-2 text-sm text-benchlot-text-secondary hover:text-benchlot-primary hover:bg-benchlot-accent-light"
                    >
                      Sign Out
                    </button>
                  </div>
                </div>
              ) : (
                <Link to="/login" className="nav-link">
                  Sign In
                </Link>
              )}
              
              <CartIcon />
            </div>
            
            {/* Mobile menu button */}
            <div className="md:hidden flex items-center">
              <button className="text-benchlot-text-secondary hover:text-benchlot-primary focus:outline-none transition duration-200">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </nav>
        </div>
      </header>
      
      <main className="flex-grow">
        {children}
      </main>
      
      <Footer />
    </div>
  );
};

export default Layout;