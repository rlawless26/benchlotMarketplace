// src/Pages/HelpPage.js
import React, { useEffect } from 'react';
import { Phone, Mail, Wrench, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

const HelpPage = () => {
  useEffect(() => {
    document.title = 'Help | Rekerf';
  }, []);

  return (
    <div className="bg-bone min-h-screen">
      <main className="max-w-7xl mx-auto px-4 py-12">
        {/* Main heading */}
        <div className="max-w-3xl mx-auto text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-display font-medium mb-6 text-dark-teal">
            Contact Rekerf Support
          </h1>
          <p className="text-xl text-secondary mb-8">
            Even master craftspeople sometimes forget to measure twice before making a cut.
            If you've hit a snag or need help with anything, we're here to smooth things over — no sandpaper required!
          </p>
        </div>

        {/* Contact card */}
        <div className="max-w-2xl mx-auto">
          <div className="bg-bone-light rounded-lg shadow-md p-8 mb-12">
            <h2 className="text-2xl font-display font-medium text-dark-teal mb-6 text-center">Ways to Connect</h2>

            <div className="space-y-6">
              <div className="flex items-center p-4 border border-stone-200 rounded-lg bg-bone">
                <div className="bg-bone-light shadow-md w-12 h-12 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                  <Phone className="h-6 w-6 text-spruce" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-dark-teal">Call Us</h3>
                  <p className="text-spruce font-medium">781-960-3398</p>
                </div>
              </div>

              <div className="flex items-center p-4 border border-stone-200 rounded-lg bg-bone">
                <div className="bg-bone-light shadow-md w-12 h-12 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                  <Mail className="h-6 w-6 text-spruce" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-dark-teal">Email Us</h3>
                  <p className="text-spruce font-medium">hello@rekerf.com</p>
                </div>
              </div>

              <div className="flex items-center p-4 border border-stone-200 rounded-lg bg-bone">
                <div className="bg-bone-light shadow-md w-12 h-12 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                  <Wrench className="h-6 w-6 text-spruce" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-dark-teal">Technical Issues?</h3>
                  <Link to="/diagnostics" className="text-spruce font-medium hover:underline">
                    Visit our diagnostics page
                  </Link>
                  <p className="text-sm text-secondary mt-1">
                    Fix environment issues, profile images not loading, and more
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="bg-bone rounded-lg py-12 px-6 max-w-4xl mx-auto">
          <h2 className="text-3xl font-display font-medium text-dark-teal mb-8 text-center">Frequently Asked Questions</h2>

          <div className="space-y-8">
            <div className="bg-bone-light p-6 rounded-lg shadow-sm">
              <h3 className="text-xl font-medium mb-3 text-dark-teal">How do I list a tool?</h3>
              <p className="text-secondary">
                Click on the "List a Tool" button in the top navigation. You'll be guided through our simple listing process where you can add details, upload photos, and set your price. Your listing will be reviewed by our team before going live.
              </p>
            </div>

            <div className="bg-bone-light p-6 rounded-lg shadow-sm">
              <h3 className="text-xl font-medium mb-3 text-dark-teal">How does tool verification work?</h3>
              <p className="text-secondary">
                Our experts review each listing to verify condition, authenticity, and market value. This ensures transparency and trust for both buyers and sellers. Verified tools receive a badge on their listing.
              </p>
            </div>

            <div className="bg-bone-light p-6 rounded-lg shadow-sm">
              <h3 className="text-xl font-medium mb-3 text-dark-teal">What are your fees?</h3>
              <p className="text-secondary">
                Listing tools on Rekerf is completely free. We charge a 5% transaction fee for sellers when a tool sells, plus a 3% payment processing fee. There are no hidden costs or subscription fees.
              </p>
            </div>

            <div className="bg-bone-light p-6 rounded-lg shadow-sm">
              <h3 className="text-xl font-medium mb-3 text-dark-teal">How do local pickups work?</h3>
              <p className="text-secondary">
                After purchase, we connect buyers and sellers to arrange a convenient pickup location. We recommend meeting in public places during daylight hours. Payment is processed through our platform for security.
              </p>
            </div>
          </div>
        </div>

        {/* Legal Links Section */}
        <div className="mt-16 max-w-4xl mx-auto">
          <h2 className="text-3xl font-display font-medium text-dark-teal mb-8 text-center">Legal Information</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-bone-light p-6 rounded-lg shadow-sm flex flex-col items-center">
              <div className="bg-bone-dark w-16 h-16 rounded-full flex items-center justify-center mb-4">
                <ShieldCheck className="h-8 w-8 text-spruce" />
              </div>
              <h3 className="text-xl font-medium mb-3 text-dark-teal">Terms of Service</h3>
              <p className="text-secondary text-center mb-4">
                Our Terms of Service outline the rules and guidelines for using the Rekerf platform.
              </p>
              <Link
                to="/terms"
                className="px-4 py-2 bg-honey text-dark-teal rounded-md hover:bg-honey-light transition-colors mt-auto"
              >
                Read Terms of Service
              </Link>
            </div>

            <div className="bg-bone-light p-6 rounded-lg shadow-sm flex flex-col items-center">
              <div className="bg-bone-dark w-16 h-16 rounded-full flex items-center justify-center mb-4">
                <ShieldCheck className="h-8 w-8 text-spruce" />
              </div>
              <h3 className="text-xl font-medium mb-3 text-dark-teal">Privacy Policy</h3>
              <p className="text-secondary text-center mb-4">
                Our Privacy Policy explains how we collect, use, and protect your personal information.
              </p>
              <Link
                to="/privacy"
                className="px-4 py-2 bg-honey text-dark-teal rounded-md hover:bg-honey-light transition-colors mt-auto"
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