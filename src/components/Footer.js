// src/components/Footer.js
import React from 'react';
import { Link } from 'react-router-dom';
import { Instagram, Mail, Phone, MapPin } from 'lucide-react';

const Footer = ({ publicMode = false }) => {
  // Public mode: slim footer — logo, tagline, info links, contact. No marketplace links.
  if (publicMode) {
    return (
      <footer className="py-8 bg-dark-teal text-center">
        <p className="text-stone-400 text-sm font-body">
          Built in New England for the hand tool community.
        </p>
        <p className="text-stone-500 text-xs mt-2 font-body">
          &copy; {new Date().getFullYear()} Rekerf. All rights reserved.
        </p>
      </footer>
    );
  }

  return (
    <footer className="bg-dark-teal text-bone py-12">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-16">
          {/* Column 1: Company Info */}
          <div>
            <h3 className="text-bone font-display text-lg mb-2">Rekerf</h3>
            <p className="text-sm mb-4 font-display italic" style={{ fontWeight: 500 }}>
              The woodworker's marketplace.
            </p>
            <p className="text-sm mb-6" style={{ color: '#6a8a84' }}>
              The trusted marketplace for woodworking tools
            </p>
            <p className="text-xs" style={{ color: '#6a8a84' }}>&copy; {new Date().getFullYear()} Rekerf. All rights reserved.</p>
          </div>

          {/* Column 2: Quick Links */}
          <div>
            <h3 className="text-bone font-display text-lg mb-4">Quick Links</h3>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <ul className="space-y-2">
                  <li>
                    <Link to="/about" className="hover:text-bone transition-colors text-sm font-body" style={{ color: '#6a8a84' }}>
                      About
                    </Link>
                  </li>
                  <li>
                    <Link to="/help" className="hover:text-bone transition-colors text-sm font-body" style={{ color: '#6a8a84' }}>
                      Help
                    </Link>
                  </li>
                  <li>
                    <Link to="/categories" className="hover:text-bone transition-colors text-sm font-body" style={{ color: '#6a8a84' }}>
                      Categories
                    </Link>
                  </li>
                </ul>
              </div>
              <div>
                <ul className="space-y-2">
                  <li>
                    <a
                      href="https://blog.rekerf.com/blog"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-bone transition-colors text-sm font-body" style={{ color: '#6a8a84' }}
                    >
                      Updates
                    </a>
                  </li>
                  <li>
                    <Link to="/" className="hover:text-bone transition-colors text-sm font-body" style={{ color: '#6a8a84' }}>
                      Marketplace
                    </Link>
                  </li>
                  <li>
                    <Link to="/tools/new" className="hover:text-bone transition-colors text-sm font-body" style={{ color: '#6a8a84' }}>
                      List a Tool
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Column 3: Contact */}
          <div>
            <h3 className="text-bone font-display text-lg mb-4">Contact</h3>
            <ul className="space-y-3">
              <li className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-honey" />
                <a href="mailto:hello@rekerf.com" className="hover:text-bone transition-colors font-body" style={{ color: '#6a8a84' }}>
                  hello@rekerf.com
                </a>
              </li>
              <li className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-honey" />
                <a href="tel:7819603998" className="hover:text-bone transition-colors font-body" style={{ color: '#6a8a84' }}>
                  781-960-3998
                </a>
              </li>
              <li className="flex items-start gap-2 text-sm">
                <MapPin className="h-4 w-4 text-honey mt-1 flex-shrink-0" />
                <span style={{ color: '#6a8a84' }}>Greater Boston Area</span>
              </li>
              <li className="mt-4">
                <a
                  href="https://www.instagram.com/rekerf/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 hover:text-bone transition-colors font-body" style={{ color: '#6a8a84' }}
                >
                  <Instagram className="h-5 w-5" />
                  <span className="text-sm">@rekerf</span>
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Links */}
        <div className="mt-12 pt-6 border-t border-dark flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex gap-6">
            <Link to="/privacy" className="text-xs hover:text-bone transition-colors font-body" style={{ color: '#6a8a84' }}>
              Privacy Policy
            </Link>
            <Link to="/terms" className="text-xs hover:text-bone transition-colors font-body" style={{ color: '#6a8a84' }}>
              Terms of Service
            </Link>
          </div>
          <div className="text-xs" style={{ color: '#6a8a84' }}>
            Made with care in Boston
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
