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

  React.useEffect(() => {
    document.title = 'Home | Rekerf';
  }, []);

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

  // Featured tools reflecting the hand tool community
  const featuredTools = [
    {
      id: 1,
      name: 'Lie-Nielsen No. 4 Smoothing Plane',
      current_price: 295,
      original_price: 375,
      location: 'Portland, ME',
      condition: 'Like New',
      images: ['/images/handtools.jpg'],
      is_verified: true
    },
    {
      id: 2,
      name: 'Veritas Low-Angle Block Plane',
      current_price: 135,
      location: 'Cambridge, MA',
      condition: 'Good',
      images: ['/images/handtools.jpg']
    },
    {
      id: 3,
      name: 'Narex Richter Chisel Set',
      current_price: 89,
      original_price: 120,
      location: 'Providence, RI',
      condition: 'Like New',
      images: ['/images/handtools.jpg'],
      is_verified: true
    }
  ];

  // Categories focused on hand tool woodworking
  const categories = [
    {
      name: "Hand Planes",
      count: null,
      imageUrl: "/images/handtools.jpg"
    },
    {
      name: "Chisels",
      count: null,
      imageUrl: "/images/handtools.jpg"
    },
    {
      name: "Hand Saws",
      count: null,
      imageUrl: "/images/handtools.jpg"
    },
    {
      name: "Sharpening",
      count: null,
      imageUrl: "/images/handtools.jpg"
    }
  ];

  // Function to calculate discount percentage
  const calculateDiscount = (originalPrice, currentPrice) => {
    if (!originalPrice || originalPrice <= currentPrice) return null;
    return Math.round((1 - currentPrice / originalPrice) * 100);
  };

  return (
    <div className="bg-bone">
      {/* Hero Section with Dual CTA */}
      <section className="relative min-h-[680px] py-40 bg-spruce">
        {/* Hero background image with overlay */}
        <div className="absolute inset-0 z-0">
          <div
            className="w-full h-full bg-cover bg-center opacity-100"
            style={{
              backgroundImage: `url('/images/shop_tools_bg.jpg')`
            }}
          ></div>
          {/* Dark overlay for better text readability */}
          <div className="absolute inset-0 bg-spruce bg-opacity-25"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <div className="flex flex-col items-start justify-center max-w-[875px]">
            {/* Hero text */}
            <div className="w-full text-left mb-8">
              <h1 className="text-4xl md:text-6xl font-display font-medium mb-6 text-bone" style={{ textShadow: '0 3px 6px rgba(0,0,0,0.8)' }}>
                The marketplace for premium used hand tools
              </h1>
              <p className="text-xl mb-8" style={{ color: '#6aaa98', textShadow: '0 2px 4px rgba(0,0,0,0.7)' }}>
                The woodworker's marketplace. Buy and sell premium hand tools from makers who understand their value. Lie-Nielsen, Veritas, vintage Stanley, and more.
              </p>
            </div>

            {/* Search Bar */}
            <div className="w-full mb-6">
              <form onSubmit={handleSearch} className="relative">
                <input
                  type="text"
                  placeholder="Search for planes, chisels, saws..."
                  className="w-full pl-12 pr-4 py-4 border border-stone-200 bg-bone-light text-dark-teal rounded-md focus:outline-none focus:border-honey shadow-md text-xl placeholder-stone-500"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ fontSize: "1.2rem" }}
                />
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-stone-500" />
                <button
                  type="submit"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 w-12 h-12 bg-spruce rounded-md hover:bg-spruce-light flex items-center justify-center"
                  aria-label="Search"
                >
                  <Search className="h-5 w-5 text-bone" />
                </button>
              </form>
            </div>

            {/* Dual CTA buttons - now below search bar */}
            <div className="flex flex-wrap gap-4 mt-2">
              {/* Browse Tools Button - Primary buyer journey */}
              <Link
                to="/marketplace"
                className="px-6 py-3 bg-honey backdrop-blur-sm border border-honey/30 rounded-md text-dark-teal font-semibold hover:bg-honey-light transition-colors flex items-center justify-center text-base"
              >
                <ShoppingBag className="h-5 w-5 mr-2" /> Browse Tools
              </Link>

              {/* Sell Tools Button - Secondary seller journey */}
              <Link
                to={isSeller() ? "/tools/new" : "/sell"}
                className="px-6 py-3 bg-spruce/20 backdrop-blur-sm border border-bone/40 rounded-md text-bone font-semibold hover:bg-spruce/30 transition-colors flex items-center justify-center text-base"
              >
                <Hammer className="h-5 w-5 mr-2" /> Start Selling
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Popular Categories Section */}
      <section className="py-14 bg-bone border-y border-stone-200">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-display font-medium text-dark-teal">Popular Categories</h2>
            <p className="text-secondary">Browse tools by category</p>
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
                  <div className="absolute inset-0 bg-gradient-to-t from-spruce/70 to-spruce/20 flex flex-col items-center justify-end pb-5">
                    <h3 className="text-bone text-lg font-medium drop-shadow-lg">{category.name}</h3>
                    {category.count && <span className="text-bone text-sm mt-1 opacity-80">{category.count} items</span>}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Listings Section */}
      <section className="py-16 bg-bone-light">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-display font-medium text-dark-teal">Featured Tools</h2>
            <Link
              to="/marketplace"
              className="text-spruce hover:text-spruce-light font-medium flex items-center"
            >
              View All <ArrowRight className="h-4 w-4 ml-1" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {featuredTools.map((tool) => (
              <div key={tool.id} className="bg-bone-light rounded-lg overflow-hidden shadow-md transition-transform hover:shadow-lg hover:-translate-y-1">
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
                    <span className="inline-flex items-center bg-bone-dark text-spruce text-xs px-2 py-1 rounded-full">
                      {tool.condition || 'Unknown'}
                    </span>
                  </div>
                  <h3 className="text-lg font-medium mb-2 text-dark-teal">{tool.name}</h3>
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-xl font-bold text-honey">${tool.current_price}</span>
                    {tool.original_price && calculateDiscount(tool.original_price, tool.current_price) && (
                      <>
                        <span className="text-sm text-stone-500 line-through">${tool.original_price}</span>
                        <span className="text-sm text-success">
                          {calculateDiscount(tool.original_price, tool.current_price)}% off
                        </span>
                      </>
                    )}
                  </div>
                  <p className="text-secondary text-sm mb-4 flex items-center">
                    <MapPin className="h-3 w-3 mr-1" /> {tool.location}
                  </p>
                  <Link to={`/tools/${tool.id}`} className="w-full py-2 border border-spruce text-spruce rounded hover:bg-bone-dark transition-colors block text-center">
                    View Details
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 bg-bone">
        <div className="max-w-7xl mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <h2 className="text-3xl font-display font-medium mb-4 text-dark-teal">How Rekerf Works</h2>
            <p className="text-secondary">Built for the hand tool community, by the hand tool community</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="text-center">
              <div className="bg-bone-light shadow-md w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                <BadgeCheck className="h-8 w-8 text-spruce" />
              </div>
              <h3 className="text-xl font-medium mb-2 text-dark-teal">Curated Listings</h3>
              <p className="text-secondary">Every listing is reviewed for accuracy. We know the difference between a No. 4 and a No. 4-1/2.</p>
            </div>

            <div className="text-center">
              <div className="bg-bone-light shadow-md w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                <Users className="h-8 w-8 text-spruce" />
              </div>
              <h3 className="text-xl font-medium mb-2 text-dark-teal">Knowledgeable Community</h3>
              <p className="text-secondary">Buy and sell with people who appreciate quality tools, not lowball offers on Facebook.</p>
            </div>

            <div className="text-center">
              <div className="bg-bone-light shadow-md w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                <ChartBar className="h-8 w-8 text-spruce" />
              </div>
              <h3 className="text-xl font-medium mb-2 text-dark-teal">Fair Pricing</h3>
              <p className="text-secondary">Price guides based on real transaction data so you know what your tools are worth.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-16 bg-bone-light">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl font-display font-medium mb-12 text-dark-teal text-center">Built for Woodworkers Like You</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Testimonial 1 */}
            <div className="bg-bone-light border border-stone-200 rounded-lg p-6 shadow-sm">
              <div className="flex items-center mb-2">
                <div className="flex text-yellow-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-current" />
                  ))}
                </div>
              </div>
              <p className="text-secondary mb-4">
                "I upgraded from a WoodRiver to a Lie-Nielsen and was able to sell my old plane to someone who'd actually use it, not a flipper."
              </p>
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-full bg-stone-200 flex items-center justify-center mr-3">
                  <span className="font-medium text-secondary">M</span>
                </div>
                <div>
                  <h4 className="font-medium text-dark-teal">Mike T.</h4>
                  <p className="text-sm text-secondary">Hobbyist Woodworker</p>
                </div>
              </div>
            </div>

            {/* Testimonial 2 */}
            <div className="bg-bone-light border border-stone-200 rounded-lg p-6 shadow-sm">
              <div className="flex items-center mb-2">
                <div className="flex text-yellow-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-current" />
                  ))}
                </div>
              </div>
              <p className="text-secondary mb-4">
                "Finally a place where people understand that a set of Veritas chisels is worth more than what Home Depot sells. Fair prices, knowledgeable buyers."
              </p>
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-full bg-stone-200 flex items-center justify-center mr-3">
                  <span className="font-medium text-secondary">S</span>
                </div>
                <div>
                  <h4 className="font-medium text-dark-teal">Sarah K.</h4>
                  <p className="text-sm text-secondary">Furniture Maker</p>
                </div>
              </div>
            </div>

            {/* Testimonial 3 */}
            <div className="bg-bone-light border border-stone-200 rounded-lg p-6 shadow-sm">
              <div className="flex items-center mb-2">
                <div className="flex text-yellow-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-current" />
                  ))}
                </div>
              </div>
              <p className="text-secondary mb-4">
                "My father left behind a shop full of quality hand tools. Rekerf helped me find them good homes instead of selling them for pennies at an estate sale."
              </p>
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-full bg-stone-200 flex items-center justify-center mr-3">
                  <span className="font-medium text-secondary">J</span>
                </div>
                <div>
                  <h4 className="font-medium text-dark-teal">John R.</h4>
                  <p className="text-sm text-secondary">Woodworker, New England</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-bone">
        <div className="max-w-7xl mx-auto px-4">
          <div className="bg-bone-light rounded-lg shadow-md p-8 md:p-12 max-w-5xl mx-auto">
            <div className="md:flex items-center justify-between">
              <div className="md:w-2/3 mb-6 md:mb-0 md:pr-8">
                <h2 className="text-3xl font-display font-medium mb-4 text-dark-teal">Ready to get started?</h2>
                <p className="text-secondary mb-2">
                  Join the community of hand tool woodworkers who buy and sell with confidence.
                </p>
              </div>
              <div className="md:w-1/3 flex flex-col gap-3">
                <Link
                  to="/marketplace"
                  className="px-6 py-3 bg-honey text-dark-teal font-medium rounded-md hover:bg-honey-light transition-colors text-center flex items-center justify-center"
                >
                  <ShoppingBag className="h-5 w-5 mr-2" />
                  Browse Tools
                </Link>
                <Link
                  to={isSeller() ? "/tools/new" : "/sell"}
                  className="px-6 py-3 bg-bone-light border border-spruce text-spruce hover:bg-bone-dark font-medium rounded-md transition-colors text-center flex items-center justify-center"
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