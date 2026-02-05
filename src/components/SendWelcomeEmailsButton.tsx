/**
 * Button component to send welcome emails to existing users
 */

import { useState } from 'react';
import { useToast } from './Toast';
import { EnvelopeIcon } from '@heroicons/react/24/outline';
import { LoadingSpinner } from './Loading';

export default function SendWelcomeEmailsButton() {
  const { success, error: showError } = useToast();
  const [loading, setLoading] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [showTestMode, setShowTestMode] = useState(false);
  const [showManualMode, setShowManualMode] = useState(false);
  const [manualEmails, setManualEmails] = useState<Array<{ subdomain: string; email: string }>>([
    { subdomain: 'plutonium', email: '' },
    { subdomain: 'mrjetstream', email: '' },
  ]);
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
      const body: any = isTest ? { testEmail: testEmail.trim() } : {};

      // Add manual email mappings if in manual mode
      if (showManualMode && manualEmails.length > 0) {
        const validManualEmails = manualEmails.filter(
          m => m.subdomain.trim() && m.email.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(m.email.trim())
        );
        if (validManualEmails.length > 0) {
          body.manualEmails = validManualEmails.map(m => ({
            subdomain: m.subdomain.trim(),
            email: m.email.trim(),
          }));
        }
      }

      const response = await fetch('/api/admin/send-welcome-emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
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
              <LoadingSpinner size="sm" />
              Sending Welcome Emails...
            </>
          ) : (
            <>
              <EnvelopeIcon className="w-4 h-4" />
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
        <button
          onClick={() => setShowManualMode(!showManualMode)}
          className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm rounded-none transition"
        >
          {showManualMode ? 'Hide' : 'Show'} Manual Email Mapping
        </button>
      </div>

      {showTestMode && (
        <div className="bg-black/30 border border-white rounded-none p-4">
          <h5 className="text-white font-semibold mb-2 text-sm">Test Mode - Send to Specific Email</h5>
          <p className="text-white/60 text-xs mb-3">Send a test welcome email to verify the email system is working.</p>
          <div className="flex gap-2">
            <input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="your-email@example.com"
              className="flex-1 px-3 py-2 bg-black/50 border border-white rounded-none text-white placeholder-white/40 focus:border-white focus:outline-none"
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

      {showManualMode && (
        <div className="bg-black/30 border border-white rounded-none p-4">
          <h5 className="text-white font-semibold mb-2 text-sm">Manual Email Mapping</h5>
          <p className="text-white/60 text-xs mb-3">
            Manually specify email addresses for specific subdomains. This is useful when automatic email lookup fails.
          </p>
          <div className="space-y-2">
            {manualEmails.map((manual, index) => (
              <div key={index} className="flex gap-2">
                <input
                  type="text"
                  value={manual.subdomain}
                  onChange={(e) => {
                    const updated = [...manualEmails];
                    updated[index].subdomain = e.target.value;
                    setManualEmails(updated);
                  }}
                  placeholder="subdomain"
                  className="w-32 px-3 py-2 bg-black/50 border border-white rounded-none text-white placeholder-white/40 focus:border-white focus:outline-none"
                />
                <input
                  type="email"
                  value={manual.email}
                  onChange={(e) => {
                    const updated = [...manualEmails];
                    updated[index].email = e.target.value;
                    setManualEmails(updated);
                  }}
                  placeholder="email@example.com"
                  className="flex-1 px-3 py-2 bg-black/50 border border-white rounded-none text-white placeholder-white/40 focus:border-white focus:outline-none"
                />
                {manualEmails.length > 1 && (
                  <button
                    onClick={() => setManualEmails(manualEmails.filter((_, i) => i !== index))}
                    className="px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-sm rounded-none transition"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={() => setManualEmails([...manualEmails, { subdomain: '', email: '' }])}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm rounded-none transition"
            >
              + Add Another Mapping
            </button>
          </div>
        </div>
      )}

      {result && (
        <div className="bg-black/30 border border-white rounded-none p-4">
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
                {result.usersProcessed.map((info, index) => (
                  <p key={index} className="text-white/60 text-xs">{info}</p>
                ))}
              </div>
            </div>
          )}
          {result.debug?.subdomainsWithoutEmails && result.debug.subdomainsWithoutEmails.length > 0 && (
            <div className="mb-4">
              <h5 className="text-yellow-400/80 text-sm font-bold mb-2">⚠️ Subdomains Without Emails Found:</h5>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {result.debug.subdomainsWithoutEmails.map((subdomain, index) => (
                  <p key={index} className="text-yellow-400/60 text-xs">{subdomain}</p>
                ))}
              </div>
              <p className="text-yellow-400/60 text-xs mt-2">
                These users need emails added to user_roles table or have submissions in blog_submissions.
              </p>
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
