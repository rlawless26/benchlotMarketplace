import React from 'react';
import { Home, Search } from 'lucide-react';
import { Link } from 'react-router-dom';

const NotFoundPage = () => {
  return (
    <div className="bg-base min-h-screen">
      <main className="max-w-3xl mx-auto px-4 py-24 text-center">
        <h1 className="text-6xl md:text-8xl font-serif font-medium text-benchlot-primary mb-4">
          404
        </h1>
        <h2 className="text-2xl md:text-3xl font-serif font-medium text-stone-800 mb-4">
          Page Not Found
        </h2>
        <p className="text-lg text-stone-600 mb-10 max-w-md mx-auto">
          Sorry, the page you're looking for doesn't exist or has been moved.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-benchlot-primary text-white rounded-lg hover:bg-benchlot-secondary transition-colors"
          >
            <Home className="h-5 w-5" />
            Back to Home
          </Link>
          <Link
            to="/marketplace"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-benchlot-primary text-benchlot-primary rounded-lg hover:bg-stone-100 transition-colors"
          >
            <Search className="h-5 w-5" />
            Browse Marketplace
          </Link>
        </div>
      </main>
    </div>
  );
};

export default NotFoundPage;
