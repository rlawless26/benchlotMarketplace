// src/components/Footer.js
import React from 'react';
import { Link } from 'react-router-dom';
import { Instagram, Mail, Phone, MapPin } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-stone-900 text-stone-300 py-12">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-16">
          {/* Column 1: Company Info */}
          <div>
            <h3 className="text-white font-serif text-lg mb-4">Benchlot</h3>
            <p className="text-sm mb-6">
              The trusted marketplace for woodworking tools
            </p>
            <p className="text-xs text-stone-400">© {new Date().getFullYear()} Benchlot. All rights reserved.</p>
          </div>
          
          {/* Column 2: Quick Links */}
          <div>
            <h3 className="text-white font-serif text-lg mb-4">Quick Links</h3>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <ul className="space-y-2">
                  <li>
                    <Link to="/about" className="text-stone-300 hover:text-benchlot-accent transition-colors text-sm">
                      About
                    </Link>
                  </li>
                  <li>
                    <Link to="/help" className="text-stone-300 hover:text-benchlot-accent transition-colors text-sm">
                      Help
                    </Link>
                  </li>
                  <li>
                    <Link to="/categories" className="text-stone-300 hover:text-benchlot-accent transition-colors text-sm">
                      Categories
                    </Link>
                  </li>
                </ul>
              </div>
              <div>
                <ul className="space-y-2">
                  <li>
                    <a 
                      href="https://blog.benchlot.com/blog" 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-stone-300 hover:text-benchlot-accent transition-colors text-sm"
                    >
                      Updates
                    </a>
                  </li>
                  <li>
                    <Link to="/" className="text-stone-300 hover:text-benchlot-accent transition-colors text-sm">
                      Marketplace
                    </Link>
                  </li>
                  <li>
                    <Link to="/tools/new" className="text-stone-300 hover:text-benchlot-accent transition-colors text-sm">
                      List a Tool
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </div>
          
          {/* Column 3: Contact */}
          <div>
            <h3 className="text-white font-serif text-lg mb-4">Contact</h3>
            <ul className="space-y-3">
              <li className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-benchlot-accent" />
                <a href="mailto:hello@benchlot.com" className="text-stone-300 hover:text-benchlot-accent transition-colors">
                  hello@benchlot.com
                </a>
              </li>
              <li className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-benchlot-accent" />
                <a href="tel:7819603998" className="text-stone-300 hover:text-benchlot-accent transition-colors">
                  781-960-3998
                </a>
              </li>
              <li className="flex items-start gap-2 text-sm">
                <MapPin className="h-4 w-4 text-benchlot-accent mt-1 flex-shrink-0" />
                <span>Greater Boston Area</span>
              </li>
              <li className="mt-4">
                <a 
                  href="https://www.instagram.com/benchlot/" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="flex items-center gap-2 text-stone-300 hover:text-benchlot-accent transition-colors"
                >
                  <Instagram className="h-5 w-5" />
                  <span className="text-sm">@benchlot</span>
                </a>
              </li>
            </ul>
          </div>
        </div>
        
        {/* Bottom Links */}
        <div className="mt-12 pt-6 border-t border-stone-700 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex gap-6">
            <Link to="/privacy" className="text-xs text-stone-400 hover:text-white transition-colors">
              Privacy Policy
            </Link>
            <Link to="/terms" className="text-xs text-stone-400 hover:text-white transition-colors">
              Terms of Service
            </Link>
          </div>
          <div className="text-xs text-stone-500">
            Made with ♥ in Boston
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;