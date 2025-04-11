/**
 * Tool Grid Component
 * Displays a grid of tool listings for the marketplace
 */
import React from 'react';
import ToolListingCard from './ToolListingCard';

const ToolGrid = ({ tools, loading, error, emptyMessage = "No tools found" }) => {
  if (loading) {
    return (
      <div className="min-h-60 flex justify-center items-center">
        <div className="text-center">
          <div className="text-xl font-bold mb-2">Loading...</div>
          <div className="text-gray-500">Please wait while we load the listings.</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
        {error}
      </div>
    );
  }

  if (!tools || tools.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md text-center">
        <p className="text-gray-600">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {tools.map(tool => (
        <ToolListingCard 
          key={tool.id} 
          tool={tool} 
          featured={tool.featured} 
        />
      ))}
    </div>
  );
};

export default ToolGrid;