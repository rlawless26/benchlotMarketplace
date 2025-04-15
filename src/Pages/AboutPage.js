// src/Pages/AboutPage.js
import React from 'react';
import { Wrench, Hammer, Home, ShoppingBag, Users, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';

const AboutPage = () => {
  return (
    <div className="bg-base min-h-screen">
      <main className="max-w-5xl mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="mb-16 text-center">
          <h1 className="text-4xl md:text-5xl font-serif font-medium text-benchlot-primary mb-4">
            About Benchlot
          </h1>
          <p className="text-xl text-stone-600 max-w-3xl mx-auto">
            Building the new standard for buying and selling tools
          </p>
        </div>
        
        {/* Founder Story Section */}
        <div className="mb-20">
          <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
            <div className="md:w-1/3">
              <div className="bg-white rounded-lg overflow-hidden shadow-md">
                <div className="aspect-square bg-stone-100 flex items-center justify-center">
                  <span className="text-stone-400 text-sm">Founder Image</span>
                </div>
                <div className="p-4">
                  <h3 className="font-serif text-xl font-medium text-benchlot-primary">Rob</h3>
                  <p className="text-stone-600">Founder</p>
                </div>
              </div>
            </div>
            
            <div className="md:w-2/3">
              <h2 className="text-3xl font-serif font-medium text-benchlot-primary mb-6">
                Our Story
              </h2>
              
              <div className="space-y-6 text-stone-600">
                <p>
                  Benchlot was born out of a personal journey. As a lifelong builder in both software and woodworking, 
                  I found myself increasingly invested in quality tools after purchasing a home in 2018.
                </p>
                
                <p>
                  What quickly became apparent was the significant barrier to entry: quality power and hand tools 
                  came with premium price tags that were often prohibitive for hobbyists and new homeowners.
                </p>
                
                <p>
                  Turning to the used market seemed like a logical step, but the experience was frustrating. 
                  Existing marketplaces weren't designed with tools in mind, leaving buyers with unanswered questions: 
                  Was I getting a good price? Had the tool been properly maintained? Were there undisclosed issues or modifications? 
                  What did other makers think about this model?
                </p>
                
                <p>
                  As a musician, I'd grown accustomed to specialized marketplaces like Reverb that made buying used instruments 
                  a transparent, community-driven experience. Why couldn't the same exist for tools?
                </p>
                
                <p>
                  That question led to the founding of Benchlot in early 2025—a marketplace built specifically for 
                  the unique needs of tool buyers and sellers. We're not just another listing site; we're creating 
                  a new standard for the tool market.
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Our Mission Section */}
        <div className="mb-20">
          <h2 className="text-3xl font-serif font-medium text-benchlot-primary mb-6 text-center">
            Our Mission
          </h2>
          
          <div className="bg-white p-8 rounded-lg shadow-md">
            <p className="text-xl text-center text-stone-600 italic">
              "To create a trusted community where quality tools find new workshops, 
              supporting makers and craftspeople by making great equipment more accessible."
            </p>
          </div>
        </div>
        
        {/* Key Features Section */}
        <div className="mb-20">
          <h2 className="text-3xl font-serif font-medium text-benchlot-primary mb-10 text-center">
            What Makes Benchlot Different
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<Hammer className="h-8 w-8 text-benchlot-primary" />}
              title="Purpose-Built for Tools"
              description="Our platform is designed specifically for the unique needs of tool buyers and sellers, with features that highlight what matters most."
            />
            
            <FeatureCard 
              icon={<Users className="h-8 w-8 text-benchlot-primary" />}
              title="Community Trust"
              description="We're building a trusted community of makers who understand tools and can provide valuable insights on condition and value."
            />
            
            <FeatureCard 
              icon={<ShoppingBag className="h-8 w-8 text-benchlot-primary" />}
              title="Better Buying Experience"
              description="Detailed listings, verified sellers, and transparent pricing make finding the right tool at the right price simpler."
            />
          </div>
        </div>
        
        {/* Timeline Section */}
        <div className="mb-20">
          <h2 className="text-3xl font-serif font-medium text-benchlot-primary mb-10 text-center">
            Our Journey
          </h2>
          
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-0 md:left-1/2 transform md:-translate-x-1/2 h-full w-1 bg-benchlot-accent-light"></div>
            
            <div className="space-y-12">
              <TimelineItem 
                year="2018"
                title="The Seed Is Planted"
                description="Rob purchases a home and begins investing in quality tools, experiencing firsthand the challenges of the used tool market."
                align="left"
              />
              
              <TimelineItem 
                year="2024"
                title="Concept Development"
                description="After years of collecting tools and experiencing the frustrations of existing marketplaces, the concept for Benchlot begins to take shape."
                align="right"
              />
              
              <TimelineItem 
                year="Early 2025"
                title="Benchlot Launches"
                description="Benchlot officially launches with a mission to transform how quality tools are bought and sold in the maker community."
                align="left"
              />
              
              <TimelineItem 
                year="2025+"
                title="Growing The Community"
                description="Expanding to new cities, building partnerships with makerspaces, and continuing to develop features that serve our community of makers."
                align="right"
              />
            </div>
          </div>
        </div>
        
        {/* Call to Action */}
        <div className="text-center">
          <h2 className="text-3xl font-serif font-medium text-benchlot-primary mb-6">
            Join Our Community
          </h2>
          
          <p className="text-lg text-stone-600 mb-8 max-w-2xl mx-auto">
            Whether you're looking to find quality tools without the premium price tag, 
            or hoping to find a new home for tools you no longer need, Benchlot is building 
            the community for you.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              to="/marketplace" 
              className="px-6 py-3 bg-benchlot-primary text-white rounded-md hover:bg-benchlot-secondary inline-flex items-center justify-center"
            >
              <ShoppingBag className="h-5 w-5 mr-2" />
              Explore the Marketplace
            </Link>
            
            <Link 
              to="/tools/new"
              className="px-6 py-3 bg-white border border-benchlot-primary text-benchlot-primary rounded-md hover:bg-stone-50 inline-flex items-center justify-center"
            >
              <Wrench className="h-5 w-5 mr-2" />
              List a Tool
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
};

// Feature Card Component
const FeatureCard = ({ icon, title, description }) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="text-xl font-serif font-medium text-benchlot-primary mb-2 text-center">
        {title}
      </h3>
      <p className="text-stone-600 text-center">
        {description}
      </p>
    </div>
  );
};

// Timeline Item Component
const TimelineItem = ({ year, title, description, align }) => {
  return (
    <div className={`relative flex items-start ${align === 'right' ? 'md:flex-row-reverse' : 'md:flex-row'}`}>
      {/* Timeline dot */}
      <div className="absolute left-0 md:left-1/2 transform md:-translate-x-1/2 w-7 h-7 rounded-full bg-benchlot-primary border-4 border-white z-10"></div>
      
      {/* Content */}
      <div className={`md:w-1/2 ${align === 'right' ? 'md:pr-20' : 'md:pl-20'} pl-20 md:pr-20`}>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center mb-2">
            <Calendar className="h-5 w-5 text-benchlot-primary mr-2" />
            <span className="text-benchlot-primary font-medium">{year}</span>
          </div>
          <h3 className="text-xl font-serif font-medium text-benchlot-primary mb-2">
            {title}
          </h3>
          <p className="text-stone-600">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
};

export default AboutPage;