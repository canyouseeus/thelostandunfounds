/**
 * Button component to send emails to existing published posts
 */

import { useState } from 'react';
import { useToast } from './Toast';
import { EnvelopeIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

export default function SendExistingPublicationEmailsButton() {
  const { success, error: showError } = useToast();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    emailsSent: number;
    emailsFailed: number;
    alreadySent: number;
    totalPosts: number;
    errors?: string[];
  } | null>(null);

  const handleSendEmails = async () => {
    if (!confirm('This will send publication notification emails to authors of existing published posts that haven\'t received an email yet. Continue?')) {
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/admin/send-existing-publication-emails', {
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
      success(data.message || 'Emails sent successfully');
    } catch (err: any) {
      console.error('Error sending emails:', err);
      showError(err.message || 'Failed to send emails');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <button
        onClick={handleSendEmails}
        disabled={loading}
        className="px-6 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 disabled:cursor-not-allowed text-white font-semibold rounded-none transition flex items-center gap-2"
      >
        {loading ? (
          <>
            <ArrowPathIcon className="w-4 h-4 animate-spin" />
            Sending Emails...
          </>
        ) : (
          <>
            <EnvelopeIcon className="w-4 h-4" />
            Send Emails to Existing Published Posts
          </>
        )}
      </button>

      {result && (
        <div className="bg-black/30 border border-white rounded-none p-4">
          <h4 className="text-white font-bold mb-3">Results:</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-white/60">Total Posts</div>
              <div className="text-white font-bold text-lg">{result.totalPosts}</div>
            </div>
            <div>
              <div className="text-green-400/60">Emails Sent</div>
              <div className="text-green-400 font-bold text-lg">{result.emailsSent}</div>
            </div>
            <div>
              <div className="text-yellow-400/60">Already Sent</div>
              <div className="text-yellow-400 font-bold text-lg">{result.alreadySent}</div>
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
