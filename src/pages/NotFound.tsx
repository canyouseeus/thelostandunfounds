/**
 * 404 Not Found Page
 */

import { Link } from 'react-router-dom';
import { Home, Search } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <h1 className="text-9xl font-bold text-white/20 mb-4">404</h1>
          <h2 className="text-3xl font-bold text-white mb-2">Page Not Found</h2>
          <p className="text-white/70">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/"
            className="px-6 py-3 bg-white text-black font-semibold rounded-lg hover:bg-white/90 transition flex items-center justify-center gap-2"
          >
            <Home className="w-5 h-5" />
            Go Home
          </Link>
          <Link
            to="/tools"
            className="px-6 py-3 bg-black border border-white/10 text-white font-semibold rounded-lg hover:border-white/30 transition flex items-center justify-center gap-2"
          >
            <Search className="w-5 h-5" />
            Explore Tools
          </Link>
        </div>
      </div>
    </div>
  );
}

