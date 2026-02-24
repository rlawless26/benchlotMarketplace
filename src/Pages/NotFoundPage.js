import React from 'react';
import { Link } from 'react-router-dom';
import { Home, Search } from 'lucide-react';

const NotFoundPage = () => {
  return (
    <div className="bg-base min-h-screen">
      <main className="max-w-3xl mx-auto px-4 py-24 text-center">
        <h1 className="text-6xl font-serif font-medium text-benchlot-primary mb-4">
          404
        </h1>
        <p className="text-xl text-stone-600 mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-benchlot-primary text-white rounded-lg hover:bg-benchlot-primary-dark transition-colors"
          >
            <Home size={18} />
            Back to Home
          </Link>
          <Link
            to="/marketplace"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-benchlot-primary text-benchlot-primary rounded-lg hover:bg-stone-100 transition-colors"
          >
            <Search size={18} />
            Browse Tools
          </Link>
        </div>
      </main>
    </div>
  );
};

export default NotFoundPage;
