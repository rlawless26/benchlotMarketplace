// src/Pages/CategoriesPage.js
import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toolCategories, toolSubcategories, toolBrands } from '../firebase/models/toolModel';

const CategoriesPage = () => {
  useEffect(() => {
    document.title = 'Categories | Rekerf';
  }, []);

  // Build categories from centralized constants
  const categories = toolCategories
    .filter(cat => cat !== 'Other')
    .map(cat => ({
      title: cat,
      subcategories: toolSubcategories[cat] || []
    }));

  // Function to create URL-friendly category/subcategory parameters
  const createMarketplaceLink = (category, subcategory = null) => {
    let url = `/marketplace?category=${encodeURIComponent(category)}`;
    if (subcategory) {
      url += `&subcategory=${encodeURIComponent(subcategory)}`;
    }
    return url;
  };

  return (
    <div className="min-h-screen bg-bone">
      <main className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-display font-medium text-dark-teal mb-8">Categories</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {categories.map((category, index) => (
            <div key={index} className="bg-bone-light rounded-lg shadow-md p-6">
              <h2 className="text-xl font-display font-medium text-spruce mb-4">
                <Link
                  to={createMarketplaceLink(category.title)}
                  className="hover:text-spruce-light transition-colors"
                >
                  {category.title}
                </Link>
              </h2>

              <ul className="space-y-2">
                {category.subcategories.map((subcategory, subIndex) => (
                  <li key={subIndex}>
                    <Link
                      to={createMarketplaceLink(category.title, subcategory)}
                      className="text-secondary hover:text-spruce transition-colors"
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
          <h2 className="text-2xl font-display font-medium text-dark-teal mb-6">Popular Brands</h2>
          <div className="bg-bone-light rounded-lg shadow-md p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {toolBrands.filter(b => b !== 'Other').map((brand, index) => (
                <div key={index} className="text-center">
                  <Link
                    to={`/marketplace?brand=${encodeURIComponent(brand)}`}
                    className="block p-4 text-secondary hover:text-spruce transition-colors"
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
          <h2 className="text-2xl font-display font-medium text-dark-teal mb-6">Shop by Condition</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {['New', 'Like New', 'Good', 'Fair'].map((condition, index) => (
              <Link
                key={index}
                to={`/marketplace?condition=${encodeURIComponent(condition)}`}
                className="bg-bone-light rounded-lg shadow-md p-6 text-center hover:bg-bone-dark transition-colors"
              >
                <span className="font-medium text-dark-teal">{condition}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Featured Collections section */}
        <div>
          <h2 className="text-2xl font-display font-medium text-dark-teal mb-6">Featured Collections</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Link
              to="/marketplace?featured=true"
              className="bg-bone-light rounded-lg shadow-md overflow-hidden group"
            >
              <div className="h-48 bg-bone-dark flex items-center justify-center">
                <span className="text-xl font-display text-spruce">Featured Tools</span>
              </div>
              <div className="p-4 group-hover:bg-bone-dark transition-colors">
                <h3 className="font-medium text-dark-teal">Curated Selection</h3>
                <p className="text-sm text-secondary">Handpicked quality tools from trusted sellers</p>
              </div>
            </Link>

            <Link
              to="/marketplace?price_range=budget"
              className="bg-bone-light rounded-lg shadow-md overflow-hidden group"
            >
              <div className="h-48 bg-bone-dark flex items-center justify-center">
                <span className="text-xl font-display text-spruce">Budget Finds</span>
              </div>
              <div className="p-4 group-hover:bg-bone-dark transition-colors">
                <h3 className="font-medium text-dark-teal">Under $100</h3>
                <p className="text-sm text-secondary">Quality tools that won't break the bank</p>
              </div>
            </Link>

            <Link
              to="/marketplace?verified=true"
              className="bg-bone-light rounded-lg shadow-md overflow-hidden group"
            >
              <div className="h-48 bg-bone-dark flex items-center justify-center">
                <span className="text-xl font-display text-spruce">Verified Tools</span>
              </div>
              <div className="p-4 group-hover:bg-bone-dark transition-colors">
                <h3 className="font-medium text-dark-teal">Rekerf Verified</h3>
                <p className="text-sm text-secondary">Expert-verified condition and authenticity</p>
              </div>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CategoriesPage;