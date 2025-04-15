// src/Pages/CategoriesPage.js
import React from 'react';
import { Link } from 'react-router-dom';

const CategoriesPage = () => {
  // Categories data structure with subcategories
  const categories = [
    {
      title: "Power Tools",
      subcategories: [
        "Table Saws", 
        "Drills", 
        "Sanders", 
        "Routers", 
        "Air Compressors",
        "Circular Saws",
        "Jigsaws",
        "Planers",
        "Jointers"
      ]
    },
    {
      title: "Hand Tools",
      subcategories: [
        "Planes", 
        "Chisels", 
        "Hammers", 
        "Screwdrivers", 
        "Wrenches",
        "Hand Saws",
        "Measuring Tools",
        "Clamps",
        "Files and Rasps"
      ]
    },
    {
      title: "Workshop Equipment",
      subcategories: [
        "Dust Collection", 
        "Work Benches", 
        "Tool Storage", 
        "Safety Equipment",
        "Lighting",
        "Shop Vacuums",
        "Workholding"
      ]
    },
    {
      title: "Machinery",
      subcategories: [
        "Lathes", 
        "Mills", 
        "Band Saws", 
        "Drill Presses", 
        "CNC Machines",
        "Scroll Saws",
        "Thickness Planers"
      ]
    },
    {
      title: "Accessories",
      subcategories: [
        "Tool Accessories",
        "Router Bits",
        "Saw Blades",
        "Drill Bits",
        "Sanding Supplies",
        "Tool Maintenance",
        "Sharpening Supplies"
      ]
    },
    {
      title: "Woodworking Specialties",
      subcategories: [
        "Carving Tools",
        "Turning Tools",
        "Joinery Tools",
        "Woodworking Kits",
        "Finishing Supplies"
      ]
    },
    {
      title: "Vintage Tools",
      subcategories: [
        "Vintage Hand Planes",
        "Vintage Saws",
        "Vintage Power Tools",
        "Vintage Measuring Tools",
        "Collectible Tools"
      ]
    }
  ];

  // Function to create URL-friendly category/subcategory parameters
  const createMarketplaceLink = (category, subcategory = null) => {
    let url = `/marketplace?category=${encodeURIComponent(category)}`;
    if (subcategory) {
      url += `&subcategory=${encodeURIComponent(subcategory)}`;
    }
    return url;
  };

  return (
    <div className="min-h-screen bg-base">
      <main className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-serif font-medium text-stone-800 mb-8">Categories</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {categories.map((category, index) => (
            <div key={index} className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-serif font-medium text-benchlot-primary mb-4">
                <Link 
                  to={createMarketplaceLink(category.title)}
                  className="hover:text-benchlot-secondary transition-colors"
                >
                  {category.title}
                </Link>
              </h2>
              
              <ul className="space-y-2">
                {category.subcategories.map((subcategory, subIndex) => (
                  <li key={subIndex}>
                    <Link 
                      to={createMarketplaceLink(category.title, subcategory)}
                      className="text-stone-700 hover:text-benchlot-primary transition-colors"
                    >
                      {subcategory}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        
        {/* Popular Brands section */}
        <div className="mb-12">
          <h2 className="text-2xl font-serif font-medium text-stone-800 mb-6">Popular Brands</h2>
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {['DeWalt', 'Milwaukee', 'Makita', 'Bosch', 'Stanley', 'Festool', 'Lie-Nielsen', 'Veritas', 'Jet', 'Delta', 'Ridgid', 'Ryobi'].map((brand, index) => (
                <div key={index} className="text-center">
                  <Link 
                    to={`/marketplace?brand=${encodeURIComponent(brand)}`}
                    className="block p-4 text-stone-700 hover:text-benchlot-primary transition-colors"
                  >
                    {brand}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Shop by Condition section */}
        <div className="mb-12">
          <h2 className="text-2xl font-serif font-medium text-stone-800 mb-6">Shop by Condition</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {['New', 'Like New', 'Excellent', 'Very Good', 'Good', 'Fair'].map((condition, index) => (
              <Link 
                key={index}
                to={`/marketplace?condition=${encodeURIComponent(condition)}`}
                className="bg-white rounded-lg shadow-md p-6 text-center hover:bg-stone-50 transition-colors"
              >
                <span className="font-medium text-stone-800">{condition}</span>
              </Link>
            ))}
          </div>
        </div>
        
        {/* Featured Collections section */}
        <div>
          <h2 className="text-2xl font-serif font-medium text-stone-800 mb-6">Featured Collections</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Link 
              to="/marketplace?featured=true"
              className="bg-white rounded-lg shadow-md overflow-hidden group"
            >
              <div className="h-48 bg-benchlot-accent-light flex items-center justify-center">
                <span className="text-xl font-serif text-benchlot-primary">Featured Tools</span>
              </div>
              <div className="p-4 group-hover:bg-stone-50 transition-colors">
                <h3 className="font-medium">Curated Selection</h3>
                <p className="text-sm text-stone-600">Handpicked quality tools from trusted sellers</p>
              </div>
            </Link>
            
            <Link 
              to="/marketplace?price_range=budget"
              className="bg-white rounded-lg shadow-md overflow-hidden group"
            >
              <div className="h-48 bg-benchlot-accent-light flex items-center justify-center">
                <span className="text-xl font-serif text-benchlot-primary">Budget Finds</span>
              </div>
              <div className="p-4 group-hover:bg-stone-50 transition-colors">
                <h3 className="font-medium">Under $100</h3>
                <p className="text-sm text-stone-600">Quality tools that won't break the bank</p>
              </div>
            </Link>
            
            <Link 
              to="/marketplace?verified=true"
              className="bg-white rounded-lg shadow-md overflow-hidden group"
            >
              <div className="h-48 bg-benchlot-accent-light flex items-center justify-center">
                <span className="text-xl font-serif text-benchlot-primary">Verified Tools</span>
              </div>
              <div className="p-4 group-hover:bg-stone-50 transition-colors">
                <h3 className="font-medium">Benchlot Verified</h3>
                <p className="text-sm text-stone-600">Expert-verified condition and authenticity</p>
              </div>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CategoriesPage;