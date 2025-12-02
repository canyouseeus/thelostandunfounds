/**
 * Button component to send welcome emails to existing users
 */

import { useState } from 'react';
import { useToast } from './Toast';
import { Mail, Loader } from 'lucide-react';

export default function SendWelcomeEmailsButton() {
  const { success, error: showError } = useToast();
  const [loading, setLoading] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [showTestMode, setShowTestMode] = useState(false);
  const [result, setResult] = useState<{
    emailsSent: number;
    emailsFailed: number;
    totalUsers: number;
    usersProcessed?: string[];
    errors?: string[];
    debug?: any;
  } | null>(null);

  const handleSendEmails = async (isTest = false) => {
    if (isTest && !testEmail.trim()) {
      showError('Please enter an email address for testing');
      return;
    }

    if (isTest && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testEmail)) {
      showError('Please enter a valid email address');
      return;
    }

    if (!isTest && !confirm('This will send welcome emails with the getting started guide link to existing users who haven\'t received one yet. Continue?')) {
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
        body: JSON.stringify(isTest ? { testEmail: testEmail.trim() } : {}),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send emails');
      }

      setResult({
        ...data.stats,
        usersProcessed: data.stats?.usersProcessed || [],
        debug: data.debug,
      });
      
      if (data.stats?.emailsSent === 0 && data.stats?.totalUsers === 0) {
        showError(data.message || 'No users found who need welcome emails');
      } else {
        success(data.message || 'Welcome emails sent successfully');
      }
    } catch (err: any) {
      console.error('Error sending welcome emails:', err);
      showError(err.message || 'Failed to send welcome emails');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => handleSendEmails(false)}
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
        <button
          onClick={() => setShowTestMode(!showTestMode)}
          className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm rounded-none transition"
        >
          {showTestMode ? 'Hide' : 'Show'} Test Mode
        </button>
      </div>

      {showTestMode && (
        <div className="bg-black/30 border border-white/10 rounded-none p-4">
          <h5 className="text-white font-semibold mb-2 text-sm">Test Mode - Send to Specific Email</h5>
          <p className="text-white/60 text-xs mb-3">Send a test welcome email to verify the email system is working.</p>
          <div className="flex gap-2">
            <input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="your-email@example.com"
              className="flex-1 px-3 py-2 bg-black/50 border border-white/10 rounded-none text-white placeholder-white/40 focus:border-white/30 focus:outline-none"
            />
            <button
              onClick={() => handleSendEmails(true)}
              disabled={loading || !testEmail.trim()}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-none transition"
            >
              Send Test Email
            </button>
          </div>
        </div>
      )}

      {result && (
        <div className="bg-black/30 border border-white/10 rounded-none p-4">
          <h4 className="text-white font-bold mb-3">Results:</h4>
          <div className="grid grid-cols-3 gap-4 text-sm mb-4">
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
          {result.usersProcessed && result.usersProcessed.length > 0 && (
            <div className="mb-4">
              <h5 className="text-white/80 text-sm font-bold mb-2">Emails Sent To:</h5>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {result.usersProcessed.map((email, index) => (
                  <p key={index} className="text-white/60 text-xs">{email}</p>
                ))}
              </div>
            </div>
          )}
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
