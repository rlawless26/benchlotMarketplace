import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Home, Search } from 'lucide-react';

const NotFoundPage = () => {
  useEffect(() => {
    document.title = '404 Not Found | Rekerf';
  }, []);

  return (
    <div className="bg-bone min-h-screen">
      <main className="max-w-3xl mx-auto px-4 py-24 text-center">
        <h1 className="text-6xl font-display font-medium text-spruce mb-4">
          404
        </h1>
        <p className="text-xl text-secondary mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-honey text-dark-teal rounded-lg hover:bg-honey-light transition-colors"
          >
            <Home size={18} />
            Back to Home
          </Link>
          <Link
            to="/marketplace"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-spruce text-spruce rounded-lg hover:bg-bone-dark transition-colors"
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