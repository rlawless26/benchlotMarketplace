/**
 * SellerOnboarding Component
 * Displays in Settings when user is not a seller
 */
import React from 'react';
import { Store, ExternalLink, Hammer, DollarSign, Shield, Users } from 'lucide-react';
import { Link } from 'react-router-dom';

const SellerOnboarding = () => {
  return (
    <div className="bg-bone-light rounded-lg shadow-md overflow-hidden">
      <div className="p-6 border-b">
        <h2 className="text-xl font-medium text-stone-800">Become a Seller</h2>
        <p className="text-stone-600 text-sm mt-1">Start selling your tools on Rekerf</p>
      </div>
      
      <div className="p-6">
        <div className="flex flex-col items-center text-center px-4 py-8">
          <div className="w-16 h-16 rounded-full bg-bone-dark flex items-center justify-center mb-4">
            <Store className="h-8 w-8 text-spruce" />
          </div>
          <h3 className="text-xl font-medium text-stone-800 mb-2">Ready to Start Selling?</h3>
          <p className="text-stone-600 mb-6 max-w-lg">
            Turn your extra tools into income by renting or selling them on Rekerf. 
            Our platform connects you with people who need quality tools for their projects.
          </p>
          
          <Link
            to="/sell"
            className="px-6 py-3 bg-honey text-dark-teal rounded-md hover:bg-spruce-light transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-spruce flex items-center font-medium"
          >
            <Hammer className="h-5 w-5 mr-2" />
            Start Selling Your Tools
          </Link>
        </div>
        
        <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-5 bg-stone-50 rounded-lg border border-stone-200">
            <div className="flex-shrink-0 p-1.5 bg-bone-dark rounded-full text-spruce inline-flex mb-3">
              <DollarSign className="h-5 w-5" />
            </div>
            <h3 className="font-medium mb-2">Earn Extra Income</h3>
            <p className="text-sm text-stone-600">
              Make money from your tools that are sitting unused in your workshop or garage.
            </p>
          </div>
          
          <div className="p-5 bg-stone-50 rounded-lg border border-stone-200">
            <div className="flex-shrink-0 p-1.5 bg-bone-dark rounded-full text-spruce inline-flex mb-3">
              <Shield className="h-5 w-5" />
            </div>
            <h3 className="font-medium mb-2">Secure Transactions</h3>
            <p className="text-sm text-stone-600">
              Our platform handles payments, contracts, and insurance to keep you protected.
            </p>
          </div>
          
          <div className="p-5 bg-stone-50 rounded-lg border border-stone-200">
            <div className="flex-shrink-0 p-1.5 bg-bone-dark rounded-full text-spruce inline-flex mb-3">
              <Users className="h-5 w-5" />
            </div>
            <h3 className="font-medium mb-2">Reach More Customers</h3>
            <p className="text-sm text-stone-600">
              Connect with a community of makers, builders, and DIY enthusiasts in your area.
            </p>
          </div>
        </div>
        
        <div className="mt-10 border-t border-stone-200 pt-6">
          <h3 className="font-medium mb-3">Helpful Resources</h3>
          <div className="space-y-3">
            {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
            <a href="#" className="flex items-center text-spruce hover:text-spruce-light">
              <ExternalLink className="h-4 w-4 mr-2" />
              Seller Guide: Getting Started
            </a>
            {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
            <a href="#" className="flex items-center text-spruce hover:text-spruce-light">
              <ExternalLink className="h-4 w-4 mr-2" />
              Tool Pricing Recommendations
            </a>
            {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
            <a href="#" className="flex items-center text-spruce hover:text-spruce-light">
              <ExternalLink className="h-4 w-4 mr-2" />
              Best Practices for Tool Photos
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SellerOnboarding;