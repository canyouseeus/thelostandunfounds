/**
 * Button component to send welcome emails to existing users
 */

import { useState } from 'react';
import { useToast } from './Toast';
import { Mail, Loader } from 'lucide-react';

export default function SendWelcomeEmailsButton() {
  const { success, error: showError } = useToast();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    emailsSent: number;
    emailsFailed: number;
    totalUsers: number;
    errors?: string[];
  } | null>(null);

  const handleSendEmails = async () => {
    if (!confirm('This will send welcome emails with the getting started guide link to existing users who haven\'t received one yet. Continue?')) {
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/admin/send-welcome-emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send emails');
      }

      setResult(data.stats);
      success(data.message || 'Welcome emails sent successfully');
    } catch (err: any) {
      console.error('Error sending welcome emails:', err);
      showError(err.message || 'Failed to send welcome emails');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <button
        onClick={handleSendEmails}
        disabled={loading}
        className="px-6 py-2 bg-green-500 hover:bg-green-600 disabled:bg-green-500/50 disabled:cursor-not-allowed text-white font-semibold rounded-none transition flex items-center gap-2"
      >
        {loading ? (
          <>
            <Loader className="w-4 h-4 animate-spin" />
            Sending Welcome Emails...
          </>
        ) : (
          <>
            <Mail className="w-4 h-4" />
            Send Welcome Emails to Existing Users
          </>
        )}
      </button>

      {result && (
        <div className="bg-black/30 border border-white/10 rounded-none p-4">
          <h4 className="text-white font-bold mb-3">Results:</h4>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-white/60">Total Users</div>
              <div className="text-white font-bold text-lg">{result.totalUsers}</div>
            </div>
            <div>
              <div className="text-green-400/60">Emails Sent</div>
              <div className="text-green-400 font-bold text-lg">{result.emailsSent}</div>
            </div>
            <div>
              <div className="text-red-400/60">Failed</div>
              <div className="text-red-400 font-bold text-lg">{result.emailsFailed}</div>
            </div>
          </div>
          {result.errors && result.errors.length > 0 && (
            <div className="mt-4">
              <h5 className="text-white/80 text-sm font-bold mb-2">Errors:</h5>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {result.errors.map((error, index) => (
                  <p key={index} className="text-red-400 text-xs">{error}</p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
