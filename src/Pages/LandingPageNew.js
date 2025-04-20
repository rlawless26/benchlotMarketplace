// src/Pages/LandingPageNew.js
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
// Import only the icons we need
import {
  Users,
  ChartBar,
  BadgeCheck,
  Check,
  Search,
  ShoppingBag,
  Wrench,
  ArrowRight,
  Star,
  MapPin,
  Hammer
} from 'lucide-react';
import { useAuth } from '../firebase';

const LandingPageNew = () => {
  const [searchQuery, setSearchQuery] = React.useState('');
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  // Function to handle search submissions
  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/marketplace?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  // Check if user is a seller
  const isSeller = () => {
    return isAuthenticated && user && (user.isSeller || user?.profile?.isSeller);
  };

  // Mock featured tools - same as original landing page
  const featuredTools = [
    {
      id: 1,
      name: 'DeWalt Table Saw',
      current_price: 499,
      original_price: 699,
      location: 'Cambridge, MA',
      condition: 'Excellent',
      images: ['/images/dewalt-saw.jpg'],
      is_verified: true
    },
    {
      id: 2,
      name: 'Vintage Stanley Hand Plane',
      current_price: 85,
      location: 'Somerville, MA',
      condition: 'Good',
      images: ['/images/stanley-plane.jpg']
    },
    {
      id: 3,
      name: 'Makita Cordless Drill Set',
      current_price: 199,
      original_price: 249,
      location: 'Boston, MA',
      condition: 'Like New',
      images: ['/images/makita-drill.jpg'],
      is_verified: true
    }
  ];

  // Categories with high-quality royalty-free images
  const categories = [
    { 
      name: "Power Tools", 
      count: 238,
      imageUrl: "/images/powertools.webp"
    },
    { 
      name: "Hand Tools", 
      count: 156,
      imageUrl: "/images/handtools.jpg"
    },
    { 
      name: "Workshop Equipment", 
      count: 94,
      imageUrl: "/images/workshopequipment.jpg"
    },
    { 
      name: "Machinery", 
      count: 67,
      imageUrl: "/images/machinery.jpg"
    }
  ];

  // Function to calculate discount percentage
  const calculateDiscount = (originalPrice, currentPrice) => {
    if (!originalPrice || originalPrice <= currentPrice) return null;
    return Math.round((1 - currentPrice / originalPrice) * 100);
  };

  return (
    <div className="bg-stone-50">
      {/* Hero Section with Dual CTA */}
      <section className="relative min-h-[680px] py-40 bg-stone-800">
        {/* Hero background image with overlay */}
        <div className="absolute inset-0 z-0">
          <div 
            className="w-full h-full bg-cover bg-center opacity-100"
            style={{ 
              backgroundImage: `url('/images/hero-plaidplaning.jpg')`
            }}
          ></div>
          {/* Removed gradient overlay for cleaner look */}
        </div>
        
        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <div className="flex flex-col items-start justify-center max-w-[875px]">
            {/* Hero text */}
            <div className="w-full text-left mb-8">
              <h1 className="text-4xl md:text-6xl font-serif font-medium mb-6 text-white" style={{ textShadow: '0 3px 6px rgba(0,0,0,0.8)' }}>
                Buy and sell woodworking tools with confidence
              </h1>
              <p className="text-xl text-white mb-8" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.7)' }}>
                The premier marketplace connecting woodworkers with quality tools and trusted sellers.
              </p>
            </div>
              
            {/* Search Bar */}
            <div className="w-full mb-6">
              <form onSubmit={handleSearch} className="relative">
                <input
                  type="text"
                  placeholder="What tool are you looking for?"
                  className="w-full pl-12 pr-4 py-4 border border-stone-200 bg-white text-stone-800 rounded-md focus:outline-none focus:border-benchlot-accent shadow-md text-xl placeholder-stone-500"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ fontSize: "1.2rem" }}
                />
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-stone-500" />
                <button 
                  type="submit"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 w-12 h-12 bg-[#17613F] rounded-md hover:bg-[#17613F]/90 flex items-center justify-center"
                  aria-label="Search"
                >
                  <Search className="h-5 w-5 text-white" />
                </button>
              </form>
            </div>
            
            {/* Dual CTA buttons - now below search bar */}
            <div className="flex flex-wrap gap-4 mt-2">
              {/* Browse Tools Button - Primary buyer journey */}
              <Link 
                to="/marketplace" 
                className="px-6 py-3 bg-[#17613F] backdrop-blur-sm border border-[#17613F]/30 rounded-md text-white font-medium hover:bg-[#17613F]/90 transition-colors flex items-center justify-center text-lg"
              >
                <ShoppingBag className="h-5 w-5 mr-2" /> Browse Tools
              </Link>
              
              {/* Sell Tools Button - Secondary seller journey */}
              <Link 
                to={isSeller() ? "/tools/new" : "/sell"} 
                className="px-6 py-3 bg-black/20 backdrop-blur-sm border border-white/40 rounded-md text-white font-medium hover:bg-black/30 transition-colors flex items-center justify-center text-lg"
              >
                <Hammer className="h-5 w-5 mr-2" /> Start Selling
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Popular Categories Section */}
      <section className="py-14 bg-stone-50 border-y border-stone-200">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-serif font-medium text-stone-800">Popular Categories</h2>
            <p className="text-stone-600">Browse tools by category</p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5 md:gap-7 max-w-5xl mx-auto">
            {categories.map((category) => (
              <Link 
                key={category.name}
                to={`/marketplace?category=${encodeURIComponent(category.name)}`}
                className="group relative block overflow-hidden rounded-lg hover:shadow-md transition-all h-48 md:h-52"
              >
                <div className="absolute inset-0 overflow-hidden">
                  <div 
                    className="w-full h-full bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                    style={{ backgroundImage: `url(${category.imageUrl})` }}
                  >
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-black/20 flex flex-col items-center justify-end pb-5">
                    <h3 className="text-white text-lg font-medium drop-shadow-lg">{category.name}</h3>
                    <span className="text-white text-sm mt-1 opacity-80">{category.count} items</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Listings Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-serif font-medium text-stone-800">Featured Tools</h2>
            <Link 
              to="/marketplace" 
              className="text-benchlot-primary hover:text-benchlot-secondary font-medium flex items-center"
            >
              View All <ArrowRight className="h-4 w-4 ml-1" />
            </Link>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {featuredTools.map((tool) => (
              <div key={tool.id} className="bg-white rounded-lg overflow-hidden shadow-md transition-transform hover:shadow-lg hover:-translate-y-1">
                <div className="w-full h-48 bg-stone-200 relative">
                  {/* Placeholder for image */}
                  {tool.is_verified && (
                    <div className="absolute top-2 left-2 z-10">
                      <span className="inline-flex items-center bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                        <Check className="h-3 w-3 mr-1" /> Verified
                      </span>
                    </div>
                  )}
                </div>
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="inline-flex items-center bg-benchlot-accent-light text-benchlot-primary text-xs px-2 py-1 rounded-full">
                      {tool.condition || 'Unknown'}
                    </span>
                  </div>
                  <h3 className="text-lg font-medium mb-2">{tool.name}</h3>
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-xl font-bold text-benchlot-primary">${tool.current_price}</span>
                    {tool.original_price && calculateDiscount(tool.original_price, tool.current_price) && (
                      <>
                        <span className="text-sm text-stone-500 line-through">${tool.original_price}</span>
                        <span className="text-sm text-green-600">
                          {calculateDiscount(tool.original_price, tool.current_price)}% off
                        </span>
                      </>
                    )}
                  </div>
                  <p className="text-stone-600 text-sm mb-4 flex items-center">
                    <MapPin className="h-3 w-3 mr-1" /> {tool.location}
                  </p>
                  <Link to={`/tools/${tool.id}`} className="w-full py-2 border border-benchlot-primary text-benchlot-primary rounded hover:bg-benchlot-accent-light transition-colors block text-center">
                    View Details
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 bg-stone-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <h2 className="text-3xl font-serif font-medium mb-4 text-stone-800">How Benchlot Works</h2>
            <p className="text-stone-600">The trusted marketplace for woodworkers and makers</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="text-center">
              <div className="bg-white shadow-md w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                <BadgeCheck className="h-8 w-8 text-benchlot-primary" />
              </div>
              <h3 className="text-xl font-medium mb-2">Verified Tools</h3>
              <p className="text-stone-600">Every listing is authenticated by our experts to ensure quality and value.</p>
            </div>

            <div className="text-center">
              <div className="bg-white shadow-md w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                <Users className="h-8 w-8 text-benchlot-primary" />
              </div>
              <h3 className="text-xl font-medium mb-2">Local Community</h3>
              <p className="text-stone-600">Connect with trusted buyers and sellers in your local maker community.</p>
            </div>

            <div className="text-center">
              <div className="bg-white shadow-md w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                <ChartBar className="h-8 w-8 text-benchlot-primary" />
              </div>
              <h3 className="text-xl font-medium mb-2">Fair Pricing</h3>
              <p className="text-stone-600">Market data and transparency ensures you get the best value.</p>
            </div>
          </div>
        </div>
      </section>
      
      {/* Testimonials Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl font-serif font-medium mb-12 text-stone-800 text-center">What Our Community Says</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Testimonial 1 */}
            <div className="bg-white border border-stone-200 rounded-lg p-6 shadow-sm">
              <div className="flex items-center mb-2">
                <div className="flex text-yellow-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-current" />
                  ))}
                </div>
              </div>
              <p className="text-stone-600 mb-4">
                "I found a vintage Stanley #4 plane in excellent condition for half the price I'd seen elsewhere. The seller was knowledgeable and shipping was fast."
              </p>
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-full bg-stone-200 flex items-center justify-center mr-3">
                  <span className="font-medium text-stone-600">M</span>
                </div>
                <div>
                  <h4 className="font-medium">Mike T.</h4>
                  <p className="text-sm text-stone-500">Hobbyist Woodworker</p>
                </div>
              </div>
            </div>
            
            {/* Testimonial 2 */}
            <div className="bg-white border border-stone-200 rounded-lg p-6 shadow-sm">
              <div className="flex items-center mb-2">
                <div className="flex text-yellow-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-current" />
                  ))}
                </div>
              </div>
              <p className="text-stone-600 mb-4">
                "As a professional woodworker, I needed to upgrade my shop. I sold my old equipment quickly and found exactly what I needed all in one place."
              </p>
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-full bg-stone-200 flex items-center justify-center mr-3">
                  <span className="font-medium text-stone-600">S</span>
                </div>
                <div>
                  <h4 className="font-medium">Sarah K.</h4>
                  <p className="text-sm text-stone-500">Professional Carpenter</p>
                </div>
              </div>
            </div>
            
            {/* Testimonial 3 */}
            <div className="bg-white border border-stone-200 rounded-lg p-6 shadow-sm">
              <div className="flex items-center mb-2">
                <div className="flex text-yellow-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-current" />
                  ))}
                </div>
              </div>
              <p className="text-stone-600 mb-4">
                "I needed to downsize my workshop and was able to sell several high-end tools quickly. The process was painless and I got fair prices for everything."
              </p>
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-full bg-stone-200 flex items-center justify-center mr-3">
                  <span className="font-medium text-stone-600">J</span>
                </div>
                <div>
                  <h4 className="font-medium">John R.</h4>
                  <p className="text-sm text-stone-500">Furniture Maker</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-stone-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-md p-8 md:p-12 max-w-5xl mx-auto">
            <div className="md:flex items-center justify-between">
              <div className="md:w-2/3 mb-6 md:mb-0 md:pr-8">
                <h2 className="text-3xl font-serif font-medium mb-4 text-stone-800">Ready to get started?</h2>
                <p className="text-stone-600 mb-2">
                  Join the Benchlot community today and connect with woodworkers in your area.
                </p>
              </div>
              <div className="md:w-1/3 flex flex-col gap-3">
                <Link 
                  to="/marketplace" 
                  className="px-6 py-3 bg-benchlot-primary hover:bg-benchlot-secondary text-white font-medium rounded-md transition-colors text-center flex items-center justify-center"
                >
                  <ShoppingBag className="h-5 w-5 mr-2" />
                  Browse Tools
                </Link>
                <Link 
                  to={isSeller() ? "/tools/new" : "/sell"} 
                  className="px-6 py-3 bg-white border border-benchlot-primary text-benchlot-primary hover:bg-benchlot-accent-light font-medium rounded-md transition-colors text-center flex items-center justify-center"
                >
                  <Hammer className="h-5 w-5 mr-2" />
                  Sell a Tool
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPageNew;