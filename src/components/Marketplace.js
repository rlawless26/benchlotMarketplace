/**
 * Marketplace Component
 * Main page for browsing and filtering tool listings
 */
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getActiveTools, getFeaturedTools, toolCategories } from '../firebase/models/toolModel';
import ToolGrid from './ToolGrid';

const Marketplace = () => {
  const [tools, setTools] = useState([]);
  const [featuredTools, setFeaturedTools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Pagination state
  const [lastVisible, setLastVisible] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Load tools on component mount and when filters change
  useEffect(() => {
    const loadTools = async () => {
      try {
        setLoading(true);
        setLastVisible(null); // Reset pagination when filters change
        
        // Get featured tools (only on initial load)
        if (!selectedCategory && !searchQuery) {
          const featured = await getFeaturedTools(4);
          setFeaturedTools(featured);
        } else {
          // Clear featured tools when filters are applied
          setFeaturedTools([]);
        }
        
        // Get regular tools with optional category filter
        const options = {
          limitCount: 20 // Default page size
        };
        
        if (selectedCategory) {
          options.category = selectedCategory;
        }
        
        const result = await getActiveTools(options);
        
        // Apply search filter client-side
        // Note: For a production app, implement server-side search
        let filteredTools = result.tools;
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          filteredTools = filteredTools.filter(tool => 
            tool.name.toLowerCase().includes(query) || 
            (tool.description && tool.description.toLowerCase().includes(query)) ||
            (tool.brand && tool.brand.toLowerCase().includes(query))
          );
        }
        
        setTools(filteredTools);
        setLastVisible(result.lastVisible);
        setHasMore(result.hasMore);
        setError(null);
      } catch (err) {
        console.error('Error loading marketplace:', err);
        setError('Failed to load listings. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    loadTools();
  }, [selectedCategory, searchQuery]);

  // Load more tools (pagination)
  const loadMoreTools = async () => {
    if (!lastVisible || loadingMore) return;
    
    try {
      setLoadingMore(true);
      
      const options = {
        limitCount: 20,
        lastVisible: lastVisible
      };
      
      if (selectedCategory) {
        options.category = selectedCategory;
      }
      
      const result = await getActiveTools(options);
      
      // Apply search filter if needed
      let additionalTools = result.tools;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        additionalTools = additionalTools.filter(tool => 
          tool.name.toLowerCase().includes(query) || 
          (tool.description && tool.description.toLowerCase().includes(query)) ||
          (tool.brand && tool.brand.toLowerCase().includes(query))
        );
      }
      
      // Append new tools to existing list
      setTools(prevTools => [...prevTools, ...additionalTools]);
      setLastVisible(result.lastVisible);
      setHasMore(result.hasMore);
    } catch (err) {
      console.error('Error loading more tools:', err);
      // Don't show error for pagination issues, just quietly fail
    } finally {
      setLoadingMore(false);
    }
  };

  // Handle category change
  const handleCategoryChange = (e) => {
    setSelectedCategory(e.target.value);
  };

  // Handle search input
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  // Handle search form submission
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    // The useEffect will handle the search
  };

  return (
    <div className="page-container">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-benchlot-primary mb-2">Tool Marketplace</h1>
          <p className="text-gray-600 max-w-3xl">
            Find the perfect tools for your next project. Browse our selection of high-quality tools available for rent or purchase.
          </p>
        </header>
        
        {/* Search and Filter */}
        <div className="bg-white p-5 rounded-card shadow-card mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <form onSubmit={handleSearchSubmit} className="flex-grow">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search tools by name, brand, or description..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="form-input pl-10"
                />
              </div>
            </form>
            
            {/* Category Filter */}
            <div className="w-full md:w-64">
              <select
                value={selectedCategory}
                onChange={handleCategoryChange}
                className="form-select"
                aria-label="Filter by category"
              >
                <option value="">All Categories</option>
                {toolCategories.map(category => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        
        {/* Featured Tools Section */}
        {featuredTools.length > 0 && !selectedCategory && !searchQuery && (
          <section className="mb-12">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-benchlot-primary">Featured Tools</h2>
              <Link to="/?featured=true" className="text-benchlot-accent hover:text-benchlot-accent-hover text-sm font-medium">
                View all featured →
              </Link>
            </div>
            <ToolGrid 
              tools={featuredTools} 
              loading={false} 
              error={null} 
              emptyMessage="No featured tools available"
              featured={true}
            />
          </section>
        )}
        
        {/* Main Listings */}
        <section>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-benchlot-primary">
              {selectedCategory 
                ? `${selectedCategory}` 
                : searchQuery
                  ? `Results for "${searchQuery}"`
                  : "All Tools"}
            </h2>
            {tools.length > 0 && (
              <div className="text-sm text-gray-500">
                Showing {tools.length} {tools.length === 1 ? 'tool' : 'tools'}
              </div>
            )}
          </div>
          
          {/* Tool Grid */}
          <ToolGrid 
            tools={tools}
            loading={loading}
            error={error}
            emptyMessage={
              searchQuery 
                ? `No results found for "${searchQuery}"` 
                : selectedCategory
                  ? `No tools found in category "${selectedCategory}"`
                  : "No tools available at this time"
            }
          />
          
          {/* Load More Button */}
          {hasMore && !loading && tools.length > 0 && (
            <div className="flex justify-center mt-8">
              <button
                onClick={loadMoreTools}
                disabled={loadingMore}
                className="btn-accent"
              >
                {loadingMore ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Loading...
                  </span>
                ) : (
                  "Load More Tools"
                )}
              </button>
            </div>
          )}
          
          {/* No results message when empty */}
          {!loading && tools.length === 0 && (
            <div className="bg-gray-50 rounded-lg p-8 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="mt-2 text-lg font-medium text-gray-900">No tools found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchQuery 
                  ? `We couldn't find any tools matching "${searchQuery}"` 
                  : selectedCategory
                    ? `No tools found in the ${selectedCategory} category`
                    : "No tools are available at this time"}
              </p>
              <div className="mt-6">
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('');
                  }}
                  className="btn-secondary"
                >
                  Clear filters
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default Marketplace;