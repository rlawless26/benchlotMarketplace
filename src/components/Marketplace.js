/**
 * Marketplace Component
 * Main page for browsing and filtering tool listings
 */
import React, { useState, useEffect } from 'react';
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
    <div className="max-w-7xl mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Tool Marketplace</h1>
      
      {/* Search and Filter */}
      <div className="bg-white p-4 rounded-lg shadow-md mb-6">
        <div className="flex flex-wrap gap-4">
          {/* Search */}
          <form onSubmit={handleSearchSubmit} className="flex-grow">
            <div className="relative">
              <input
                type="text"
                placeholder="Search listings..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="w-full border border-gray-300 rounded-md pl-3 pr-10 py-2"
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 transform -translate-y-1/2"
              >
                🔍
              </button>
            </div>
          </form>
          
          {/* Category Filter */}
          <div className="min-w-48">
            <select
              value={selectedCategory}
              onChange={handleCategoryChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
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
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Featured Tools</h2>
          <ToolGrid 
            tools={featuredTools} 
            loading={false} 
            error={null} 
            emptyMessage="No featured tools available"
          />
        </div>
      )}
      
      {/* All Listings */}
      <div>
        <h2 className="text-2xl font-semibold mb-4">
          {selectedCategory 
            ? `${selectedCategory} Tools` 
            : searchQuery
              ? `Search Results for "${searchQuery}"`
              : "All Tools"}
        </h2>
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
          <div className="flex justify-center mt-6">
            <button
              onClick={loadMoreTools}
              disabled={loadingMore}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loadingMore ? "Loading..." : "Load More"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Marketplace;