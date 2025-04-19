// src/Pages/MarketplacePage.js
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Sliders, 
  Check, 
  ChevronDown,
  X,
  Filter,
  Truck,
  ArrowDownAZ as SortAsc,
  Search,
  MapPin,
  Loader
} from 'lucide-react';

import ToolListingCard from '../components/ToolListingCard';
import { getActiveTools, getFeaturedTools, toolCategories, toolConditions } from '../firebase/models/toolModel';

const MarketplacePage = () => {
  // Use search params for URL filtering
  const [searchParams, setSearchParams] = useSearchParams();
  
  // State for mobile filter panel
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);
  const [selectedCondition, setSelectedCondition] = useState([]);
  const [priceRange, setPriceRange] = useState([0, 2000]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('featured');
  
  // Add loading and error states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Add state for actual tool listings
  const [toolListings, setToolListings] = useState([]);
  
  // Filter categories with subcategories
  const categoryData = {
    'All Categories': [],
    'Power Tools': ['Table Saws', 'Drills', 'Sanders', 'Routers', 'Air Compressors'],
    'Hand Tools': ['Planes', 'Chisels', 'Hammers', 'Screwdrivers', 'Wrenches'],
    'Workshop Equipment': ['Dust Collection', 'Work Benches', 'Tool Storage', 'Safety Equipment'],
    'Machinery': ['Lathes', 'Mills', 'Band Saws', 'Drill Presses', 'CNC']
  };
  
  // Categories array for simple iteration
  const categories = Object.keys(categoryData);
  
  // Condition options (using the predefined conditions from toolModel.js)
  const conditions = toolConditions;
  
  // Load filters from URL parameters when component mounts
  useEffect(() => {
    // Get category from URL
    const categoryParam = searchParams.get('category');
    if (categoryParam && categories.includes(categoryParam)) {
      setSelectedCategory(categoryParam);
    }
    
    // Get subcategory from URL
    const subcategoryParam = searchParams.get('subcategory');
    if (subcategoryParam) {
      setSelectedSubcategory(subcategoryParam);
    }
    
    // Get condition filters from URL (comma-separated list)
    const conditionParam = searchParams.get('condition');
    if (conditionParam) {
      const conditionArray = conditionParam.split(',');
      // Only use valid conditions that are in our predefined list
      const validConditions = conditionArray.filter(c => conditions.includes(c));
      setSelectedCondition(validConditions);
    }
    
    // Get price range from URL
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    if (minPrice !== null || maxPrice !== null) {
      setPriceRange([
        minPrice !== null ? parseInt(minPrice) : 0,
        maxPrice !== null ? parseInt(maxPrice) : 2000
      ]);
    }
    
    // Get search query from URL
    const queryParam = searchParams.get('query');
    if (queryParam) {
      setSearchQuery(queryParam);
    }
    
    // Get sort parameter from URL
    const sortParam = searchParams.get('sort');
    if (sortParam && ['featured', 'newest', 'price_low', 'price_high'].includes(sortParam)) {
      setSortBy(sortParam);
    }
  }, [searchParams]);
  
  // Update URL when filters change
  const updateUrlParams = () => {
    const newParams = new URLSearchParams();
    
    // Only add params that aren't default values
    if (selectedCategory !== 'All Categories') {
      newParams.set('category', selectedCategory);
    }
    
    if (selectedSubcategory) {
      newParams.set('subcategory', selectedSubcategory);
    }
    
    if (selectedCondition.length > 0) {
      newParams.set('condition', selectedCondition.join(','));
    }
    
    if (priceRange[0] > 0) {
      newParams.set('minPrice', priceRange[0].toString());
    }
    
    if (priceRange[1] < 2000) {
      newParams.set('maxPrice', priceRange[1].toString());
    }
    
    if (searchQuery) {
      newParams.set('query', searchQuery);
    }
    
    if (sortBy !== 'featured') {
      newParams.set('sort', sortBy);
    }
    
    // Update the URL without refreshing the page
    setSearchParams(newParams);
  };
  
  // Fetch tools from Firebase when filters change
  useEffect(() => {
    const loadTools = async () => {
      setLoading(true);
      setError(null);
      
      try {
        console.log("Loading marketplace tools...");
        
        // Prepare filter object for the API call
        const options = {
          limitCount: 20
        };
        
        if (selectedCategory !== 'All Categories') {
          options.category = selectedCategory;
        }
        
        // Get tools from Firebase
        const result = await getActiveTools(options);
        
        // Apply client-side filtering for subcategory, condition, price, and search
        let filteredTools = result.tools || [];
        
        // Filter by subcategory if selected
        if (selectedSubcategory) {
          filteredTools = filteredTools.filter(tool => 
            tool.subcategory === selectedSubcategory
          );
        }
        
        // Filter by condition if selected
        if (selectedCondition.length > 0) {
          filteredTools = filteredTools.filter(tool => 
            selectedCondition.includes(tool.condition)
          );
        }
        
        // Filter by price range
        filteredTools = filteredTools.filter(tool => {
          const price = tool.price || tool.current_price || 0;
          return price >= priceRange[0] && price <= priceRange[1];
        });
        
        // Filter by search query
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          filteredTools = filteredTools.filter(tool => 
            (tool.name && tool.name.toLowerCase().includes(query)) || 
            (tool.description && tool.description.toLowerCase().includes(query)) ||
            (tool.brand && tool.brand.toLowerCase().includes(query))
          );
        }
        
        // Sort tools based on sort option
        switch (sortBy) {
          case 'price_low':
            filteredTools.sort((a, b) => (a.price || 0) - (b.price || 0));
            break;
          case 'price_high':
            filteredTools.sort((a, b) => (b.price || 0) - (a.price || 0));
            break;
          case 'newest':
            filteredTools.sort((a, b) => {
              if (a.created_at && b.created_at) {
                return b.created_at.seconds - a.created_at.seconds;
              }
              return 0;
            });
            break;
          default:
            // 'featured' - featured items first, then by creation date
            filteredTools.sort((a, b) => {
              if (a.featured && !b.featured) return -1;
              if (!a.featured && b.featured) return 1;
              if (a.created_at && b.created_at) {
                return b.created_at.seconds - a.created_at.seconds;
              }
              return 0;
            });
        }
        
        setToolListings(filteredTools);
      } catch (err) {
        console.error('Error loading tools:', err);
        setError('Failed to load tools. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    loadTools();
    
    // Update URL whenever filters change
    updateUrlParams();
  }, [selectedCategory, selectedSubcategory, selectedCondition, priceRange, searchQuery, sortBy]);
  
  // Toggle condition filter
  const toggleCondition = (condition) => {
    if (selectedCondition.includes(condition)) {
      setSelectedCondition(selectedCondition.filter(item => item !== condition));
    } else {
      setSelectedCondition([...selectedCondition, condition]);
    }
  };
  
  // Handle category change
  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
    // Reset subcategory when category changes
    setSelectedSubcategory(null);
  };
  
  // Handle subcategory change
  const handleSubcategoryChange = (subcategory) => {
    setSelectedSubcategory(subcategory);
  };
  
  // Handle sort change
  const handleSortChange = (sortValue) => {
    setSortBy(sortValue);
  };
  
  // Reset filters
  const resetFilters = () => {
    setSelectedCategory('All Categories');
    setSelectedSubcategory(null);
    setSelectedCondition([]);
    setPriceRange([0, 2000]);
    setSearchQuery('');
    setSortBy('featured');
    
    // Clear URL parameters
    setSearchParams({});
  };
  
  return (
    <div className="bg-stone-50 min-h-screen">
      {/* Page content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-3xl font-serif font-medium text-stone-800 mb-2">Browse Tools</h1>
          <p className="text-stone-600">Find quality tools from verified sellers in the Boston area</p>
        </div>
        
        {/* Main content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Filters - Desktop */}
          <div className="hidden lg:block">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-lg font-medium mb-4 text-stone-800">Filters</h2>
              
              {/* Categories */}
              <div className="mb-6">
                <h3 className="font-medium text-stone-700 mb-3">Category</h3>
                <div className="space-y-2">
                  {categories.map((category) => (
                    <div key={category} className="flex items-center">
                      <input
                        type="radio"
                        id={`category-${category}`}
                        name="category"
                        checked={selectedCategory === category}
                        onChange={() => handleCategoryChange(category)}
                        className="mr-2 h-4 w-4 text-benchlot-primary focus:ring-benchlot-primary"
                      />
                      <label htmlFor={`category-${category}`} className="text-sm text-stone-700">
                        {category}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Subcategories - Only show when a category is selected */}
              {selectedCategory !== 'All Categories' && categoryData[selectedCategory].length > 0 && (
                <div className="mb-6">
                  <h3 className="font-medium text-stone-700 mb-3">Subcategory</h3>
                  <div className="space-y-2">
                    {categoryData[selectedCategory].map((subcategory) => (
                      <div key={subcategory} className="flex items-center">
                        <input
                          type="radio"
                          id={`subcategory-${subcategory}`}
                          name="subcategory"
                          checked={selectedSubcategory === subcategory}
                          onChange={() => handleSubcategoryChange(subcategory)}
                          className="mr-2 h-4 w-4 text-benchlot-primary focus:ring-benchlot-primary"
                        />
                        <label htmlFor={`subcategory-${subcategory}`} className="text-sm text-stone-700">
                          {subcategory}
                        </label>
                      </div>
                    ))}
                    <div className="flex items-center">
                      <input
                        type="radio"
                        id="subcategory-all"
                        name="subcategory"
                        checked={selectedSubcategory === null}
                        onChange={() => handleSubcategoryChange(null)}
                        className="mr-2 h-4 w-4 text-benchlot-primary focus:ring-benchlot-primary"
                      />
                      <label htmlFor="subcategory-all" className="text-sm text-stone-700">
                        All {selectedCategory}
                      </label>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Conditions */}
              <div className="mb-6">
                <h3 className="font-medium text-stone-700 mb-3">Condition</h3>
                <div className="space-y-2">
                  {conditions.map((condition) => (
                    <div key={condition} className="flex items-center">
                      <input
                        type="checkbox"
                        id={`condition-${condition}`}
                        checked={selectedCondition.includes(condition)}
                        onChange={() => toggleCondition(condition)}
                        className="mr-2 h-4 w-4 text-benchlot-primary focus:ring-benchlot-primary"
                      />
                      <label htmlFor={`condition-${condition}`} className="text-sm text-stone-700">
                        {condition}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Price Range */}
              <div className="mb-6">
                <h3 className="font-medium text-stone-700 mb-3">Price Range</h3>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm text-stone-600">$</span>
                  <input
                    type="number"
                    min="0"
                    value={priceRange[0]}
                    onChange={(e) => setPriceRange([parseInt(e.target.value) || 0, priceRange[1]])}
                    className="w-full px-3 py-1 border border-stone-300 rounded-md text-sm"
                  />
                  <span className="text-sm text-stone-600">to</span>
                  <span className="text-sm text-stone-600">$</span>
                  <input
                    type="number"
                    min="0"
                    value={priceRange[1]}
                    onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value) || 2000])}
                    className="w-full px-3 py-1 border border-stone-300 rounded-md text-sm"
                  />
                </div>
                <div className="mt-4">
                  <input
                    type="range"
                    min="0"
                    max="2000"
                    value={priceRange[1]}
                    onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
                    className="w-full h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </div>
              
              {/* Location */}
              <div className="mb-6">
                <h3 className="font-medium text-stone-700 mb-3">Location</h3>
                <div className="relative">
                  <div className="flex items-center border border-stone-300 rounded-md px-3 py-2">
                    <MapPin className="h-4 w-4 text-stone-400 mr-2" />
                    <input
                      type="text"
                      placeholder="Boston, MA"
                      className="w-full text-sm focus:outline-none"
                    />
                  </div>
                  <div className="mt-2">
                    <label className="flex items-center text-sm text-stone-700">
                      <input
                        type="checkbox"
                        className="mr-2 h-4 w-4 text-benchlot-primary focus:ring-benchlot-primary"
                      />
                      Within 10 miles
                    </label>
                  </div>
                </div>
              </div>
              
              {/* Verified Only */}
              <div className="mb-6">
                <label className="flex items-center text-stone-700">
                  <input
                    type="checkbox"
                    className="mr-2 h-4 w-4 text-benchlot-primary focus:ring-benchlot-primary"
                  />
                  Verified tools only
                </label>
              </div>
              
              {/* Reset Filters */}
              <button 
                className="w-full py-2 border border-stone-300 rounded-md text-stone-700 hover:bg-stone-50 text-sm"
                onClick={resetFilters}
              >
                Reset Filters
              </button>
            </div>
          </div>
          
          {/* Main content */}
          <div className="lg:col-span-3">
            {/* Search and sort bar */}
            <div className="bg-white p-4 rounded-lg shadow-md mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
              {/* Search */}
              <div className="relative w-full md:w-1/2">
                <input
                  type="text"
                  placeholder="Search tools..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-stone-300 rounded-md focus:outline-none focus:border-benchlot-primary"
                />
                <Search className="absolute left-3 top-2.5 h-5 w-5 text-stone-400" />
              </div>
              
              {/* Mobile filters button */}
              <button 
                className="lg:hidden flex items-center gap-2 px-4 py-2 border border-stone-300 rounded-md text-stone-700"
                onClick={() => setMobileFiltersOpen(true)}
              >
                <Filter className="h-4 w-4" />
                Filters
              </button>
              
              {/* Sort dropdown */}
              <div className="relative group w-full md:w-auto">
                <button className="w-full md:w-auto flex items-center justify-between gap-2 px-4 py-2 border border-stone-300 rounded-md text-stone-700">
                  <div className="flex items-center gap-2">
                    <SortAsc className="h-4 w-4" />
                    <span>Sort by: {sortBy === 'newest' ? 'Newest' : 
                             sortBy === 'price_low' ? 'Price: Low to High' : 
                             sortBy === 'price_high' ? 'Price: High to Low' : 
                             'Featured'}</span>
                  </div>
                  <ChevronDown className="h-4 w-4" />
                </button>
                <div className="absolute right-0 top-full mt-1 bg-white shadow-lg rounded-md p-1 min-w-[200px] hidden group-hover:block z-10">
                  <button 
                    className="w-full text-left px-3 py-2 text-stone-700 hover:bg-benchlot-accent-light hover:text-benchlot-primary rounded-md text-sm"
                    onClick={() => handleSortChange('featured')}
                  >
                    Featured
                  </button>
                  <button 
                    className="w-full text-left px-3 py-2 text-stone-700 hover:bg-benchlot-accent-light hover:text-benchlot-primary rounded-md text-sm"
                    onClick={() => handleSortChange('price_low')}
                  >
                    Price: Low to High
                  </button>
                  <button 
                    className="w-full text-left px-3 py-2 text-stone-700 hover:bg-benchlot-accent-light hover:text-benchlot-primary rounded-md text-sm"
                    onClick={() => handleSortChange('price_high')}
                  >
                    Price: High to Low
                  </button>
                  <button 
                    className="w-full text-left px-3 py-2 text-stone-700 hover:bg-benchlot-accent-light hover:text-benchlot-primary rounded-md text-sm"
                    onClick={() => handleSortChange('newest')}
                  >
                    Newest First
                  </button>
                </div>
              </div>
            </div>
            
            {/* Display active filters */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              {/* Category filter badge */}
              {selectedCategory !== 'All Categories' && (
                <span className="inline-flex items-center bg-benchlot-accent-light text-benchlot-primary text-xs px-2 py-1 rounded-full">
                  {selectedCategory}
                  <button 
                    className="ml-1 text-benchlot-primary" 
                    onClick={() => handleCategoryChange('All Categories')}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              
              {/* Subcategory filter badge */}
              {selectedSubcategory && (
                <span className="inline-flex items-center bg-benchlot-accent-light text-benchlot-primary text-xs px-2 py-1 rounded-full">
                  {selectedSubcategory}
                  <button 
                    className="ml-1 text-benchlot-primary" 
                    onClick={() => setSelectedSubcategory(null)}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              
              {/* Condition filter badges */}
              {selectedCondition.map((condition) => (
                <span key={condition} className="inline-flex items-center bg-benchlot-accent-light text-benchlot-primary text-xs px-2 py-1 rounded-full">
                  {condition}
                  <button 
                    className="ml-1 text-benchlot-primary" 
                    onClick={() => toggleCondition(condition)}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              
              {/* Price filter badge */}
              {(priceRange[0] > 0 || priceRange[1] < 2000) && (
                <span className="inline-flex items-center bg-benchlot-accent-light text-benchlot-primary text-xs px-2 py-1 rounded-full">
                  ${priceRange[0]} - ${priceRange[1]}
                  <button 
                    className="ml-1 text-benchlot-primary" 
                    onClick={() => setPriceRange([0, 2000])}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              
              {/* Search query badge */}
              {searchQuery && (
                <span className="inline-flex items-center bg-benchlot-accent-light text-benchlot-primary text-xs px-2 py-1 rounded-full">
                  Search: {searchQuery}
                  <button 
                    className="ml-1 text-benchlot-primary" 
                    onClick={() => setSearchQuery('')}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              
              {/* Clear all filters button */}
              {(selectedCategory !== 'All Categories' || 
                selectedSubcategory || 
                selectedCondition.length > 0 || 
                priceRange[0] > 0 || 
                priceRange[1] < 2000 || 
                searchQuery) && (
                <button 
                  className="text-xs text-benchlot-primary hover:text-benchlot-secondary ml-2"
                  onClick={resetFilters}
                >
                  Clear all
                </button>
              )}
            </div>
            
            {/* Results count */}
            <div className="mb-4">
              <p className="text-stone-600">
                {loading ? 'Loading tools...' : `Showing ${toolListings.length} results`}
              </p>
            </div>
            
            {/* Loading state */}
            {loading && (
              <div className="flex justify-center items-center py-12">
                <Loader className="h-8 w-8 text-benchlot-primary animate-spin" />
                <span className="ml-2 text-stone-600">Loading tools...</span>
              </div>
            )}
            
            {/* Error state */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
                {error}
              </div>
            )}
            
            {/* Grid of listings */}
            {!loading && !error && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {toolListings.map((tool) => (
                  <ToolListingCard 
                    key={tool.id} 
                    tool={tool} 
                    featured={tool.featured}
                  />
                ))}
              </div>
            )}
            
            {/* Empty state */}
            {!loading && !error && toolListings.length === 0 && (
              <div className="text-center py-12">
                <h3 className="text-lg font-medium text-stone-800 mb-2">No tools found</h3>
                <p className="text-stone-600 mb-6">Try adjusting your filters or search criteria</p>
                <button 
                  className="px-4 py-2 bg-benchlot-primary text-white rounded-md hover:bg-benchlot-secondary"
                  onClick={resetFilters}
                >
                  Reset Filters
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
      
      {/* Mobile filter panel */}
      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden lg:hidden">
          <div className="absolute inset-0 bg-stone-900 bg-opacity-75" onClick={() => setMobileFiltersOpen(false)}></div>
          <div className="absolute inset-y-0 right-0 max-w-full flex">
            <div className="relative w-screen max-w-md">
              <div className="h-full flex flex-col bg-white shadow-xl overflow-y-scroll">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b">
                  <h2 className="text-lg font-medium text-stone-800">Filters</h2>
                  <button 
                    className="text-stone-500 hover:text-stone-700"
                    onClick={() => setMobileFiltersOpen(false)}
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
                
                {/* Filter content - same as desktop but in mobile panel */}
                <div className="p-4">
                  {/* Categories */}
                  <div className="mb-6">
                    <h3 className="font-medium text-stone-700 mb-3">Category</h3>
                    <div className="space-y-2">
                      {categories.map((category) => (
                        <div key={category} className="flex items-center">
                          <input
                            type="radio"
                            id={`mobile-category-${category}`}
                            name="mobile-category"
                            checked={selectedCategory === category}
                            onChange={() => handleCategoryChange(category)}
                            className="mr-2 h-4 w-4 text-benchlot-primary focus:ring-benchlot-primary"
                          />
                          <label htmlFor={`mobile-category-${category}`} className="text-sm text-stone-700">
                            {category}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Subcategories - Only show when a category is selected */}
                  {selectedCategory !== 'All Categories' && categoryData[selectedCategory].length > 0 && (
                    <div className="mb-6">
                      <h3 className="font-medium text-stone-700 mb-3">Subcategory</h3>
                      <div className="space-y-2">
                        {categoryData[selectedCategory].map((subcategory) => (
                          <div key={subcategory} className="flex items-center">
                            <input
                              type="radio"
                              id={`mobile-subcategory-${subcategory}`}
                              name="mobile-subcategory"
                              checked={selectedSubcategory === subcategory}
                              onChange={() => handleSubcategoryChange(subcategory)}
                              className="mr-2 h-4 w-4 text-benchlot-primary focus:ring-benchlot-primary"
                            />
                            <label htmlFor={`mobile-subcategory-${subcategory}`} className="text-sm text-stone-700">
                              {subcategory}
                            </label>
                          </div>
                        ))}
                        <div className="flex items-center">
                          <input
                            type="radio"
                            id="mobile-subcategory-all"
                            name="mobile-subcategory"
                            checked={selectedSubcategory === null}
                            onChange={() => handleSubcategoryChange(null)}
                            className="mr-2 h-4 w-4 text-benchlot-primary focus:ring-benchlot-primary"
                          />
                          <label htmlFor="mobile-subcategory-all" className="text-sm text-stone-700">
                            All {selectedCategory}
                          </label>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Conditions */}
                  <div className="mb-6">
                    <h3 className="font-medium text-stone-700 mb-3">Condition</h3>
                    <div className="space-y-2">
                      {conditions.map((condition) => (
                        <div key={condition} className="flex items-center">
                          <input
                            type="checkbox"
                            id={`mobile-condition-${condition}`}
                            checked={selectedCondition.includes(condition)}
                            onChange={() => toggleCondition(condition)}
                            className="mr-2 h-4 w-4 text-benchlot-primary focus:ring-benchlot-primary"
                          />
                          <label htmlFor={`mobile-condition-${condition}`} className="text-sm text-stone-700">
                            {condition}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Price Range */}
                  <div className="mb-6">
                    <h3 className="font-medium text-stone-700 mb-3">Price Range</h3>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm text-stone-600">$</span>
                      <input
                        type="number"
                        min="0"
                        value={priceRange[0]}
                        onChange={(e) => setPriceRange([parseInt(e.target.value) || 0, priceRange[1]])}
                        className="w-full px-3 py-1 border border-stone-300 rounded-md text-sm"
                      />
                      <span className="text-sm text-stone-600">to</span>
                      <span className="text-sm text-stone-600">$</span>
                      <input
                        type="number"
                        min="0"
                        value={priceRange[1]}
                        onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value) || 2000])}
                        className="w-full px-3 py-1 border border-stone-300 rounded-md text-sm"
                      />
                    </div>
                  </div>
                  
                  {/* Location */}
                  <div className="mb-6">
                    <h3 className="font-medium text-stone-700 mb-3">Location</h3>
                    <div className="relative">
                      <div className="flex items-center border border-stone-300 rounded-md px-3 py-2">
                        <MapPin className="h-4 w-4 text-stone-400 mr-2" />
                        <input
                          type="text"
                          placeholder="Boston, MA"
                          className="w-full text-sm focus:outline-none"
                        />
                      </div>
                      <div className="mt-2">
                        <label className="flex items-center text-sm text-stone-700">
                          <input
                            type="checkbox"
                            className="mr-2 h-4 w-4 text-benchlot-primary focus:ring-benchlot-primary"
                          />
                          Within 10 miles
                        </label>
                      </div>
                    </div>
                  </div>
                  
                  {/* Verified Only */}
                  <div className="mb-6">
                    <label className="flex items-center text-stone-700">
                      <input
                        type="checkbox"
                        className="mr-2 h-4 w-4 text-benchlot-primary focus:ring-benchlot-primary"
                      />
                      Verified tools only
                    </label>
                  </div>
                </div>
                
                {/* Action buttons */}
                <div className="border-t px-4 py-4 mt-auto">
                  <div className="flex gap-4">
                    <button 
                      className="flex-1 px-4 py-2 border border-stone-300 rounded-md text-stone-700 hover:bg-stone-50"
                      onClick={resetFilters}
                    >
                      Reset
                    </button>
                    <button 
                      className="flex-1 px-4 py-2 bg-benchlot-primary text-white rounded-md hover:bg-benchlot-secondary"
                      onClick={() => setMobileFiltersOpen(false)}
                    >
                      Apply Filters
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MarketplacePage;