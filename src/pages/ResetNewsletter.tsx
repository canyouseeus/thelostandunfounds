import { useState } from 'react';
import { EnvelopeIcon, ArrowPathIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { LoadingSpinner } from '../components/Loading';

export default function ResetNewsletter() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; deleted?: number; remaining?: number } | null>(null);

  const handleReset = async () => {
    setLoading(true);
    setResult(null);

    try {
      // Try the direct REST API endpoint first, fallback to regular endpoint
      const response = await fetch('/api/reset-newsletter-direct?token=reset-newsletter-2024', {
        method: 'GET',
      }).catch(() =>
        fetch('/api/reset-newsletter?token=reset-newsletter-2024', {
          method: 'GET',
        })
      );

      if (response.ok) {
        const data = await response.json();
        setResult({
          success: true,
          message: data.message || 'Newsletter list reset successfully!',
          deleted: data.deleted,
          remaining: data.remaining,
        });
      } else {
        const error = await response.json();
        setResult({
          success: false,
          message: error.error || 'Failed to reset newsletter list',
        });
      }
    } catch (error: any) {
      setResult({
        success: false,
        message: error.message || 'An error occurred',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-black/50 border border-white rounded-none p-8">
        <div className="text-center mb-8">
          <EnvelopeIcon className="w-16 h-16 text-white mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-white mb-2">Reset Newsletter List</h1>
          <p className="text-white/60">Clear all newsletter subscribers for testing</p>
        </div>

        {result && (
          <div className={`mb-6 p-4 rounded-none border ${result.success
            ? 'bg-green-400/10 border-white'
            : 'bg-red-400/10 border-white'
            }`}>
            <div className="flex items-start gap-3">
              {result.success ? (
                <CheckCircleIcon className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
              ) : (
                <XCircleIcon className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
              )}
              <div className="flex-1">
                <p className={`font-medium ${result.success ? 'text-green-400' : 'text-red-400'}`}>
                  {result.success ? 'Success!' : 'Error'}
                </p>
                <p className="text-white/80 text-sm mt-1">{result.message}</p>
                {result.success && result.deleted !== undefined && (
                  <div className="mt-2 text-white/60 text-xs">
                    <p>Deleted: {result.deleted} subscribers</p>
                    <p>Remaining: {result.remaining} subscribers</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <button
          onClick={handleReset}
          disabled={loading}
          className="w-full bg-white text-black font-semibold py-4 px-6 rounded-none hover:bg-white/90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <LoadingSpinner size="sm" />
              <span>Resetting...</span>
            </>
          ) : (
            <>
              <ArrowPathIcon className="w-5 h-5" />
              <span>Reset Newsletter List</span>
            </>
          )}
        </button>

        <p className="text-white/40 text-xs text-center mt-6">
          This will delete all newsletter subscribers from the database.
        </p>

        <div className="mt-6 pt-6 border-t border-white">
          <p className="text-white/60 text-xs text-center mb-3">Or use direct REST API link:</p>
          <a
            href="/api/reset-newsletter-direct?token=reset-newsletter-2024"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white hover:text-white/80 text-sm underline break-all block text-center bg-white/5 hover:bg-white/10 px-4 py-2 rounded transition"
          >
            Reset via REST API
          </a>
          <p className="text-white/40 text-xs text-center mt-2">
            Uses Supabase REST API directly
          </p>
        </div>
      </div>
    </div>
  );
}
