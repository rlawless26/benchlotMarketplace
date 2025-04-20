// src/Pages/HelpPage.js
import React from 'react';
import { Phone, Mail, HelpCircle, Wrench, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

const HelpPage = () => {
  return (
    <div className="bg-base min-h-screen">
      <main className="max-w-7xl mx-auto px-4 py-12">
        {/* Main heading */}
        <div className="max-w-3xl mx-auto text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-serif font-medium mb-6 text-stone-800">
            Contact Benchlot Support
          </h1>
          <p className="text-xl text-stone-600 mb-8">
            Even master craftspeople sometimes forget to measure twice before making a cut. 
            If you've hit a snag or need help with anything, we're here to smooth things over—no sandpaper required!
          </p>
        </div>
        
        {/* Contact card */}
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-md p-8 mb-12">
            <h2 className="text-2xl font-serif font-medium text-stone-800 mb-6 text-center">Ways to Connect</h2>
            
            <div className="space-y-6">
              <div className="flex items-center p-4 border border-stone-200 rounded-lg bg-stone-50">
                <div className="bg-white shadow-md w-12 h-12 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                  <Phone className="h-6 w-6 text-benchlot-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-stone-800">Call Us</h3>
                  <p className="text-benchlot-primary font-medium">781-960-3398</p>
                </div>
              </div>
              
              <div className="flex items-center p-4 border border-stone-200 rounded-lg bg-stone-50">
                <div className="bg-white shadow-md w-12 h-12 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                  <Mail className="h-6 w-6 text-benchlot-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-stone-800">Email Us</h3>
                  <p className="text-benchlot-primary font-medium">hello@benchlot.com</p>
                </div>
              </div>
              
              <div className="flex items-center p-4 border border-stone-200 rounded-lg bg-stone-50">
                <div className="bg-white shadow-md w-12 h-12 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                  <Wrench className="h-6 w-6 text-benchlot-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-stone-800">Technical Issues?</h3>
                  <Link to="/diagnostics" className="text-benchlot-primary font-medium hover:underline">
                    Visit our diagnostics page
                  </Link>
                  <p className="text-sm text-stone-500 mt-1">
                    Fix environment issues, profile images not loading, and more
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* FAQ Section */}
        <div className="bg-stone-50 rounded-lg py-12 px-6 max-w-4xl mx-auto">
          <h2 className="text-3xl font-serif font-medium text-stone-800 mb-8 text-center">Frequently Asked Questions</h2>
          
          <div className="space-y-8">
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="text-xl font-medium mb-3 text-stone-800">How do I list a tool?</h3>
              <p className="text-stone-600">
                Click on the "List a Tool" button in the top navigation. You'll be guided through our simple listing process where you can add details, upload photos, and set your price. Your listing will be reviewed by our team before going live.
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="text-xl font-medium mb-3 text-stone-800">How does tool verification work?</h3>
              <p className="text-stone-600">
                Our experts review each listing to verify condition, authenticity, and market value. This ensures transparency and trust for both buyers and sellers. Verified tools receive a badge on their listing.
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="text-xl font-medium mb-3 text-stone-800">What are your fees?</h3>
              <p className="text-stone-600">
                Listing tools on Benchlot is completely free. We charge a 5% transaction fee for sellers when a tool sells, plus a 3% payment processing fee. There are no hidden costs or subscription fees.
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="text-xl font-medium mb-3 text-stone-800">How do local pickups work?</h3>
              <p className="text-stone-600">
                After purchase, we connect buyers and sellers to arrange a convenient pickup location. We recommend meeting in public places during daylight hours. Payment is processed through our platform for security.
              </p>
            </div>
          </div>
        </div>
        
        {/* Legal Links Section */}
        <div className="mt-16 max-w-4xl mx-auto">
          <h2 className="text-3xl font-serif font-medium text-stone-800 mb-8 text-center">Legal Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-sm flex flex-col items-center">
              <div className="bg-benchlot-accent-light w-16 h-16 rounded-full flex items-center justify-center mb-4">
                <ShieldCheck className="h-8 w-8 text-benchlot-primary" />
              </div>
              <h3 className="text-xl font-medium mb-3 text-stone-800">Terms of Service</h3>
              <p className="text-stone-600 text-center mb-4">
                Our Terms of Service outline the rules and guidelines for using the Benchlot platform.
              </p>
              <Link 
                to="/terms" 
                className="px-4 py-2 bg-benchlot-primary text-white rounded-md hover:bg-benchlot-secondary transition-colors mt-auto"
              >
                Read Terms of Service
              </Link>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm flex flex-col items-center">
              <div className="bg-benchlot-accent-light w-16 h-16 rounded-full flex items-center justify-center mb-4">
                <ShieldCheck className="h-8 w-8 text-benchlot-primary" />
              </div>
              <h3 className="text-xl font-medium mb-3 text-stone-800">Privacy Policy</h3>
              <p className="text-stone-600 text-center mb-4">
                Our Privacy Policy explains how we collect, use, and protect your personal information.
              </p>
              <Link 
                to="/privacy" 
                className="px-4 py-2 bg-benchlot-primary text-white rounded-md hover:bg-benchlot-secondary transition-colors mt-auto"
              >
                Read Privacy Policy
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default HelpPage;