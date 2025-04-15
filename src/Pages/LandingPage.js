// src/Pages/LandingPage.js
import React, { useState } from 'react';
// Import only the icons we need
import {
  Users,
  ChartBar,
  BadgeCheck,
  Check
} from 'lucide-react';

const LandingPage = () => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState({ type: '', message: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus({ type: '', message: '' });

    try {
      // In the Firebase implementation, we would save the email to Firestore
      // For now, we'll just simulate a successful response
      setTimeout(() => {
        setSubmitStatus({
          type: 'success',
          message: 'Thanks for joining! We\'ll keep you updated.'
        });
        setEmail('');
        setIsSubmitting(false);
      }, 1000);
    } catch (error) {
      console.error('Error:', error);
      setSubmitStatus({
        type: 'error',
        message: 'Something went wrong. Please try again.'
      });
      setIsSubmitting(false);
    }
  };

  // Mock featured tools
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

  // Function to calculate discount percentage
  const calculateDiscount = (originalPrice, currentPrice) => {
    if (!originalPrice || originalPrice <= currentPrice) return null;
    return Math.round((1 - currentPrice / originalPrice) * 100);
  };

  return (
    <div className="bg-stone-50">
      {/* Hero Section with Form */}
      <section className="py-20 bg-stone-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-serif font-medium mb-6 text-stone-800">
              Buy and sell new and used woodworking tools
            </h1>
            <p className="text-xl text-stone-600 mb-8">
              The marketplace for woodworkers to buy and sell new, used, and vintage woodworking tools.</p>
            <div className="bg-white rounded-lg shadow-md p-8 max-w-xl mx-auto">
              <div className="mb-6">
                <h3 className="text-2xl font-serif font-medium mb-2">Join Benchlot Today</h3>
                <p className="text-stone-600 text-sm">We're building the new standard for buying and selling tools</p>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="flex flex-col md:flex-row gap-4">
                  <input
                    type="email"
                    placeholder="Enter your email"
                    className="flex-1 px-4 py-3 border border-stone-300 rounded-md focus:outline-none focus:border-benchlot-primary"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isSubmitting}
                  />
                  <button
                    type="submit"
                    className="px-6 py-3 bg-benchlot-primary hover:bg-benchlot-secondary text-white font-medium rounded-md transition-colors"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Joining...' : 'Sign Up'}
                  </button>
                </div>

                {submitStatus.message && (
                  <div className={`mt-4 p-3 rounded-md text-center text-sm ${submitStatus.type === 'success'
                      ? 'bg-green-50 text-green-700 border border-green-200'
                      : 'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                    {submitStatus.message}
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-white">
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
      
      {/* Featured Listings Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <h2 className="text-3xl font-serif font-medium mb-4 text-stone-800">Featured Tools</h2>
            <p className="text-stone-600">Quality tools from verified sellers in the Boston area</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {featuredTools.map((tool) => (
              <div key={tool.id} className="bg-white rounded-lg overflow-hidden shadow-md transition-transform hover:shadow-lg hover:-translate-y-1">
                <div className="w-full h-48 bg-stone-200">
                  {/* Placeholder for image */}
                </div>
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-2">
                    {tool.is_verified && (
                      <span className="inline-flex items-center bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                        <Check className="h-3 w-3 mr-1" /> Verified
                      </span>
                    )}
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
                  <p className="text-stone-600 text-sm mb-4">{tool.location}</p>
                  <button className="w-full py-2 border border-benchlot-primary text-benchlot-primary rounded hover:bg-benchlot-accent-light transition-colors">
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-stone-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-serif font-medium mb-4 text-stone-800">Ready to join the community?</h2>
            <p className="text-stone-600 mb-8">Be among the first to access our marketplace when we launch</p>

            <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-8 max-w-xl mx-auto">
              <div className="flex flex-col md:flex-row gap-4">
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="flex-1 px-4 py-3 border border-stone-300 rounded-md focus:outline-none focus:border-benchlot-primary"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isSubmitting}
                />
                <button
                  type="submit"
                  className="px-6 py-3 bg-benchlot-primary hover:bg-benchlot-secondary text-white font-medium rounded-md transition-colors"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Joining...' : 'Join Waitlist'}
                </button>
              </div>

              {submitStatus.message && (
                <div className={`mt-4 p-3 rounded-md text-center text-sm ${submitStatus.type === 'success'
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                  }`}>
                  {submitStatus.message}
                </div>
              )}
            </form>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;