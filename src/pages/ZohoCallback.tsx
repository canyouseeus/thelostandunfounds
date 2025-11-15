// Zoho OAuth Callback Handler
// Extracts authorization code from URL and displays it

import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

export default function ZohoCallback() {
  const [searchParams] = useSearchParams();
  const [code, setCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const authCode = searchParams.get('code');
    if (authCode) {
      setCode(authCode);
      // Copy to clipboard automatically
      navigator.clipboard.writeText(authCode).then(() => {
        console.log('Authorization code copied to clipboard');
      });
    } else {
      setError('No authorization code found in URL');
    }
  }, [searchParams]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center text-white p-8">
          <h1 className="text-2xl font-bold mb-4">❌ Error</h1>
          <p>{error}</p>
          <p className="mt-4 text-sm text-gray-400">
            Check the URL for a "code" parameter
          </p>
        </div>
      </div>
    );
  }

  if (!code) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center text-white">
          <h1 className="text-2xl font-bold mb-4">Loading...</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="max-w-2xl w-full p-8 bg-gray-900 rounded-lg border border-gray-700">
        <h1 className="text-2xl font-bold text-white mb-4">✅ Authorization Code Received</h1>
        <p className="text-gray-300 mb-6">
          Your authorization code has been copied to your clipboard automatically.
        </p>
        
        <div className="bg-black p-4 rounded border border-gray-600 mb-6">
          <p className="text-xs text-gray-400 mb-2">Authorization Code:</p>
          <code className="text-white break-all">{code}</code>
        </div>

        <div className="space-y-4">
          <p className="text-white font-semibold">Next Steps:</p>
          <ol className="list-decimal list-inside space-y-2 text-gray-300">
            <li>Open Terminal</li>
            <li>Run this command (replace YOUR_CLIENT_ID, YOUR_CLIENT_SECRET with your values):</li>
          </ol>
          
          <div className="bg-black p-4 rounded border border-gray-600 mt-4">
            <code className="text-white text-sm break-all">
              cd /Users/canyouseeus/Desktop/SCOT33/thelostandunfounds && ./get-refresh-token.sh YOUR_CLIENT_ID YOUR_CLIENT_SECRET {code}
            </code>
          </div>

          <p className="text-gray-400 text-sm mt-4">
            Or manually exchange the code using the curl command in the ZOHO_MAIL_OAUTH_SETUP.md guide.
          </p>
        </div>
      </div>
    </div>
  );
}

