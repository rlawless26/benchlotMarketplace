import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowRight, 
  ShieldCheck, 
  Camera, 
  DollarSign, 
  BarChart,
  Users,
  Star,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../firebase/hooks/useAuth';

const SellerLandingPage = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [email, setEmail] = useState('');
  
  const handleSubmit = (e) => {
    e.preventDefault();
    if (isAuthenticated()) {
      // User is already logged in, send them to seller sign up
      navigate('/seller/signup');
    } else {
      // User is not logged in, send them to login with a redirect
      navigate('/login', { state: { from: '/seller/signup' } });
    }
  };
  
  return (
    <div className="bg-white min-h-screen">
      {/* Hero Section */}
      <section className="py-16 md:py-24 bg-stone-50 border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-4xl md:text-5xl font-medium text-gray-800 mb-6">
                Sell your tools to Boston's woodworking community
              </h1>
              <p className="text-lg text-gray-600 mb-8">
                Join the trusted marketplace for quality woodworking tools. 
                Professional photography, secure payments, and a dedicated 
                community of makers ready to buy your tools.
              </p>
              <form onSubmit={handleSubmit} className="max-w-md">
                <div className="flex flex-col sm:flex-row gap-3">
                  <input 
                    type="email" 
                    placeholder="Enter your email to get started" 
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-benchlot-primary"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                  <button 
                    type="submit"
                    className="bg-benchlot-primary text-white px-6 py-3 rounded-md hover:bg-benchlot-secondary transition-colors flex items-center justify-center"
                  >
                    Get Started
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </button>
                </div>
              </form>
            </div>
            <div className="hidden md:block">
              <img 
                src="https://images.unsplash.com/photo-1607675331274-2d41b9f3a860?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80"
                alt="Craftsman with woodworking tools" 
                className="rounded-lg shadow-lg object-cover w-full h-auto"
              />
            </div>
          </div>
        </div>
      </section>
      
      {/* How It Works Section */}
      <section className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-medium text-gray-800 mb-4">
              How selling works on Benchlot
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Our straightforward process helps you turn unused tools into cash quickly and safely.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-100">
              <div className="w-12 h-12 bg-benchlot-accent-light rounded-full flex items-center justify-center mb-6">
                <Camera className="h-6 w-6 text-benchlot-primary" />
              </div>
              <h3 className="text-xl font-medium text-gray-800 mb-3">
                List your tools
              </h3>
              <p className="text-gray-600">
                Create detailed listings with our guided process. We offer professional photography 
                services in the Boston area to help your tools stand out.
              </p>
            </div>
            
            <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-100">
              <div className="w-12 h-12 bg-benchlot-accent-light rounded-full flex items-center justify-center mb-6">
                <ShieldCheck className="h-6 w-6 text-benchlot-primary" />
              </div>
              <h3 className="text-xl font-medium text-gray-800 mb-3">
                Make secure sales
              </h3>
              <p className="text-gray-600">
                Our secure payment system protects both buyers and sellers. 
                Coordinate local pickup or use our shipping partners for safe delivery.
              </p>
            </div>
            
            <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-100">
              <div className="w-12 h-12 bg-benchlot-accent-light rounded-full flex items-center justify-center mb-6">
                <DollarSign className="h-6 w-6 text-benchlot-primary" />
              </div>
              <h3 className="text-xl font-medium text-gray-800 mb-3">
                Get paid quickly
              </h3>
              <p className="text-gray-600">
                Receive payment directly to your bank account within 2-3 business days 
                of a completed sale. No waiting for checks or dealing with cash.
              </p>
            </div>
          </div>
        </div>
      </section>
      
      {/* Why Sell on Benchlot Section */}
      <section className="py-16 md:py-24 bg-stone-50 border-y border-stone-200">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-medium text-gray-800 mb-4">
              Why sell on Benchlot?
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Join hundreds of makers who trust Benchlot to sell their quality tools.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16">
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-benchlot-accent-light rounded-full flex items-center justify-center">
                  <Users className="h-5 w-5 text-benchlot-primary" />
                </div>
              </div>
              <div>
                <h3 className="font-medium text-lg text-gray-800 mb-2">Reach the right buyers</h3>
                <p className="text-gray-600">
                  Connect with a targeted community of woodworkers and makers who understand 
                  and value quality tools rather than bargain hunters.
                </p>
              </div>
            </div>
            
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-benchlot-accent-light rounded-full flex items-center justify-center">
                  <Camera className="h-5 w-5 text-benchlot-primary" />
                </div>
              </div>
              <div>
                <h3 className="font-medium text-lg text-gray-800 mb-2">Professional presentation</h3>
                <p className="text-gray-600">
                  We offer photography services and listing assistance to ensure your 
                  tools look their best and attract serious buyers.
                </p>
              </div>
            </div>
            
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-benchlot-accent-light rounded-full flex items-center justify-center">
                  <BarChart className="h-5 w-5 text-benchlot-primary" />
                </div>
              </div>
              <div>
                <h3 className="font-medium text-lg text-gray-800 mb-2">Fair market pricing</h3>
                <p className="text-gray-600">
                  Our pricing guides help you set the right price based on actual market 
                  data, so you can get what your tools are truly worth.
                </p>
              </div>
            </div>
            
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-benchlot-accent-light rounded-full flex items-center justify-center">
                  <ShieldCheck className="h-5 w-5 text-benchlot-primary" />
                </div>
              </div>
              <div>
                <h3 className="font-medium text-lg text-gray-800 mb-2">Secure transactions</h3>
                <p className="text-gray-600">
                  No-haggle selling with verified buyers, secure payments processed by 
                  Stripe, and protection against fraud or payment issues.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Testimonials */}
      <section className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-medium text-gray-800 mb-4">
              What sellers are saying
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Hear from makers who have successfully sold tools on Benchlot
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
              <div className="flex items-center mb-4">
                <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
              </div>
              <p className="text-gray-600 mb-4">
                "I sold my entire workshop in two weeks when I was downsizing. The professional 
                photos made a huge difference, and I got fair prices for everything."
              </p>
              <div className="flex items-center">
                <div className="w-10 h-10 bg-gray-200 rounded-full mr-3"></div>
                <div>
                  <h4 className="font-medium text-gray-800">Thomas R.</h4>
                  <p className="text-sm text-gray-500">Cambridge, MA</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
              <div className="flex items-center mb-4">
                <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
              </div>
              <p className="text-gray-600 mb-4">
                "As someone who upgrades my tools regularly, Benchlot has become my go-to 
                platform. The buyers are serious and knowledgeable, no lowball offers."
              </p>
              <div className="flex items-center">
                <div className="w-10 h-10 bg-gray-200 rounded-full mr-3"></div>
                <div>
                  <h4 className="font-medium text-gray-800">Sarah J.</h4>
                  <p className="text-sm text-gray-500">Somerville, MA</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
              <div className="flex items-center mb-4">
                <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
              </div>
              <p className="text-gray-600 mb-4">
                "The secure payment system gives me peace of mind. I've sold over 20 tools on 
                Benchlot and every transaction has been smooth and professional."
              </p>
              <div className="flex items-center">
                <div className="w-10 h-10 bg-gray-200 rounded-full mr-3"></div>
                <div>
                  <h4 className="font-medium text-gray-800">Michael T.</h4>
                  <p className="text-sm text-gray-500">Boston, MA</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="py-16 md:py-24 bg-benchlot-primary text-white">
        <div className="max-w-5xl mx-auto px-4 md:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-medium mb-6">
            Ready to turn your unused tools into cash?
          </h2>
          <p className="text-lg text-benchlot-accent-light mb-8 max-w-3xl mx-auto">
            Join the trusted marketplace connecting quality tools with the makers who need them. 
            Start selling today with just your email and a few photos.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button 
              className="bg-white text-benchlot-primary px-8 py-4 rounded-md hover:bg-benchlot-accent-light transition-colors text-lg font-medium"
              onClick={() => navigate(isAuthenticated() ? '/seller/signup' : '/login', { state: { from: '/seller/signup' } })}
            >
              Start Selling
            </button>
            <button 
              className="bg-transparent border border-white text-white px-8 py-4 rounded-md hover:bg-benchlot-secondary transition-colors text-lg font-medium"
              onClick={() => navigate('/help')}
            >
              Learn More
            </button>
          </div>
        </div>
      </section>

      {/* What You'll Need Section */}
      <section className="py-16 md:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-medium text-gray-800 mb-6">
                What you'll need to get started
              </h2>
              <p className="text-lg text-gray-600 mb-6">
                Setting up your seller account is easy and secure.
              </p>
              
              <ul className="space-y-4">
                <li className="flex gap-3">
                  <ChevronRight className="h-6 w-6 text-benchlot-primary flex-shrink-0" />
                  <div>
                    <h3 className="font-medium text-gray-800">Valid photo ID</h3>
                    <p className="text-gray-600">For identity verification and account security</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <ChevronRight className="h-6 w-6 text-benchlot-primary flex-shrink-0" />
                  <div>
                    <h3 className="font-medium text-gray-800">Bank account information</h3>
                    <p className="text-gray-600">To receive your payments securely and quickly</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <ChevronRight className="h-6 w-6 text-benchlot-primary flex-shrink-0" />
                  <div>
                    <h3 className="font-medium text-gray-800">Basic tool details</h3>
                    <p className="text-gray-600">Including brands, models, and condition information</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <ChevronRight className="h-6 w-6 text-benchlot-primary flex-shrink-0" />
                  <div>
                    <h3 className="font-medium text-gray-800">Good quality photos</h3>
                    <p className="text-gray-600">Or schedule a session with our photography team</p>
                  </div>
                </li>
              </ul>
              
              <div className="mt-8">
                <button 
                  className="flex items-center text-benchlot-primary font-medium hover:text-benchlot-secondary"
                  onClick={() => navigate('/help')}
                >
                  View detailed requirements
                  <ArrowRight className="ml-2 h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="hidden md:block">
              <img 
                src="https://images.unsplash.com/photo-1586864387789-628af9feed72?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80" 
                alt="Setting up a seller account" 
                className="rounded-lg shadow-lg object-cover w-full"
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default SellerLandingPage;