import { useState } from 'react';
import { Mail, RefreshCw, CheckCircle, XCircle, Loader } from 'lucide-react';

export default function ResetNewsletter() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; deleted?: number; remaining?: number } | null>(null);

  const handleReset = async () => {
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/reset-newsletter?token=reset-newsletter-2024', {
        method: 'GET',
      });

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
      <div className="max-w-md w-full bg-black border border-white/10 rounded-lg p-8">
        <div className="text-center mb-8">
          <Mail className="w-16 h-16 text-white mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-white mb-2">Reset Newsletter List</h1>
          <p className="text-white/60">Clear all newsletter subscribers for testing</p>
        </div>

        {result && (
          <div className={`mb-6 p-4 rounded-lg border ${
            result.success 
              ? 'bg-green-400/10 border-green-400/20' 
              : 'bg-red-400/10 border-red-400/20'
          }`}>
            <div className="flex items-start gap-3">
              {result.success ? (
                <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
              ) : (
                <XCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
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
          className="w-full bg-white text-black font-semibold py-4 px-6 rounded-lg hover:bg-white/90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader className="w-5 h-5 animate-spin" />
              <span>Resetting...</span>
            </>
          ) : (
            <>
              <RefreshCw className="w-5 h-5" />
              <span>Reset Newsletter List</span>
            </>
          )}
        </button>

        <p className="text-white/40 text-xs text-center mt-6">
          This will delete all newsletter subscribers from the database.
        </p>
        
        <div className="mt-6 pt-6 border-t border-white/10">
          <p className="text-white/60 text-xs text-center mb-2">Or use direct link:</p>
          <a 
            href="/api/reset-newsletter?token=reset-newsletter-2024"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/60 hover:text-white text-xs underline break-all block text-center"
          >
            /api/reset-newsletter?token=reset-newsletter-2024
          </a>
        </div>
      </div>
    </div>
  );
}
