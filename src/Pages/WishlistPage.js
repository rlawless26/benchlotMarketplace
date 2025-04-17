/**
 * WishlistPage Component
 * Displays the user's saved/wishlisted tools
 */
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, Loader, AlertCircle, ShoppingBag, Search } from 'lucide-react';
import { useWishlist } from '../firebase/hooks/useWishlist';
import { useAuth } from '../firebase/hooks/useAuth';
import WishlistToolCard from '../components/WishlistToolCard';

const WishlistPage = () => {
  const { wishlistItems, loading, error, removeFromWishlist } = useWishlist();
  const { isAuthenticated } = useAuth();
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOption, setSortOption] = useState('newest');
  const itemsPerPage = 9;
  const navigate = useNavigate();

  // Check authentication on mount
  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/login', { state: { from: '/wishlist' } });
    }
  }, [isAuthenticated, navigate]);

  // Filter and sort wishlist items
  const filteredItems = wishlistItems
    .filter(item => 
      item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.brand?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortOption) {
        case 'newest':
          // Sort by added date (newest first)
          const dateA = a.addedAt ? new Date(a.addedAt.seconds * 1000) : new Date(0);
          const dateB = b.addedAt ? new Date(b.addedAt.seconds * 1000) : new Date(0);
          return dateB - dateA;
        case 'priceAsc':
          // Sort by price (lowest first)
          return (a.price || 0) - (b.price || 0);
        case 'priceDesc':
          // Sort by price (highest first)
          return (b.price || 0) - (a.price || 0);
        case 'name':
          // Sort by name (A-Z)
          return (a.name || '').localeCompare(b.name || '');
        default:
          return 0;
      }
    });

  // Calculate pagination
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Handle removing an item from the wishlist
  const handleRemoveFromWishlist = async (toolId) => {
    await removeFromWishlist(toolId);
    
    // If we're on a page that would now be empty, go to the previous page
    const remainingItems = filteredItems.filter(item => item.id !== toolId);
    const newTotalPages = Math.ceil(remainingItems.length / itemsPerPage);
    if (currentPage > newTotalPages && newTotalPages > 0) {
      setCurrentPage(newTotalPages);
    }
  };

  // Handle search input change
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); // Reset to first page when search changes
  };

  // Handle sort change
  const handleSortChange = (e) => {
    setSortOption(e.target.value);
    setCurrentPage(1); // Reset to first page when sort changes
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className="bg-stone-50 min-h-screen">
        <main className="max-w-7xl mx-auto px-4 py-8">
          <h1 className="text-3xl font-serif mb-6">Saved Tools</h1>
          
          <div className="animate-pulse">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((item) => (
                <div key={item} className="bg-white rounded-lg overflow-hidden shadow-md">
                  <div className="w-full h-48 bg-stone-200"></div>
                  <div className="p-4">
                    <div className="h-5 bg-stone-200 rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-stone-200 rounded w-1/2 mb-4"></div>
                    <div className="flex justify-between">
                      <div className="h-6 bg-stone-200 rounded w-1/3"></div>
                      <div className="h-6 bg-stone-200 rounded w-1/4"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="bg-stone-50 min-h-screen">
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-serif">Saved Tools</h1>
          <div className="text-sm text-stone-500">
            {filteredItems.length} {filteredItems.length === 1 ? 'item' : 'items'} saved
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6 flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            <span>{error}</span>
          </div>
        )}

        {/* Filter and Sort Controls */}
        {wishlistItems.length > 0 && (
          <div className="bg-white p-4 rounded-lg shadow-sm mb-6 flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search your saved tools..."
                value={searchTerm}
                onChange={handleSearchChange}
                className="border border-stone-300 rounded-md pl-10 pr-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-benchlot-primary"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-stone-400" />
            </div>
            
            <div className="flex items-center">
              <label htmlFor="sortOrder" className="mr-2 text-stone-600 whitespace-nowrap">Sort by:</label>
              <select
                id="sortOrder"
                value={sortOption}
                onChange={handleSortChange}
                className="border border-stone-300 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-benchlot-primary"
                style={{ 
                  height: '40px', 
                  appearance: 'none',
                  backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23666666%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")',
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 0.7rem top 50%',
                  backgroundSize: '0.65rem auto',
                  paddingRight: '2rem',
                  minWidth: '140px'
                }}
              >
                <option value="newest">Newest First</option>
                <option value="priceAsc">Price: Low to High</option>
                <option value="priceDesc">Price: High to Low</option>
                <option value="name">Name: A to Z</option>
              </select>
            </div>
          </div>
        )}

        {wishlistItems.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-lg border border-stone-200 shadow-sm">
            <Heart className="h-12 w-12 mx-auto text-stone-400 mb-4" />
            <h2 className="text-xl font-medium mb-2">No saved tools yet</h2>
            <p className="text-stone-500 mb-6">When you save tools you like, they'll appear here</p>
            <Link 
              to="/marketplace"
              className="inline-flex items-center px-4 py-2 bg-benchlot-primary text-white rounded hover:bg-benchlot-secondary transition-colors"
            >
              <ShoppingBag className="h-4 w-4 mr-2" />
              Browse Tools
            </Link>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-lg border border-stone-200 shadow-sm">
            <Search className="h-12 w-12 mx-auto text-stone-400 mb-4" />
            <h2 className="text-xl font-medium mb-2">No matching tools found</h2>
            <p className="text-stone-500 mb-2">Try adjusting your search term</p>
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="text-benchlot-primary hover:text-benchlot-secondary mt-2"
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginatedItems.map(tool => (
                <WishlistToolCard 
                  key={tool.id} 
                  tool={tool} 
                  onRemove={handleRemoveFromWishlist} 
                />
              ))}
            </div>
            
            {/* Pagination */}
            {filteredItems.length > itemsPerPage && (
              <div className="mt-8 flex justify-center">
                <div className="flex space-x-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 border border-stone-300 rounded hover:bg-stone-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  
                  {Array.from(
                    { length: Math.min(5, totalPages) },
                    (_, i) => {
                      // For more than 5 pages, show a sliding window
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else {
                        if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                      }
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`px-3 py-1 border rounded ${
                            currentPage === pageNum
                              ? 'bg-benchlot-primary text-white border-benchlot-primary'
                              : 'border-stone-300 hover:bg-stone-100'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    }
                  )}
                  
                  <button
                    onClick={() => 
                      setCurrentPage(prev => 
                        Math.min(prev + 1, totalPages)
                      )
                    }
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 border border-stone-300 rounded hover:bg-stone-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default WishlistPage;