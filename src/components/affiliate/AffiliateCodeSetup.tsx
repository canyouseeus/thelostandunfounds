import { useState } from 'react';
import { Check, X, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../Toast';

interface AffiliateCodeSetupProps {
  onSuccess: (code: string) => void;
}

export default function AffiliateCodeSetup({ onSuccess }: AffiliateCodeSetupProps) {
  const { user } = useAuth();
  const { success, error: showError } = useToast();
  const [code, setCode] = useState('');
  const [checking, setChecking] = useState(false);
  const [creating, setCreating] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);

  const validateCode = (value: string): boolean => {
    // Must be 4-12 uppercase letters/numbers
    const regex = /^[A-Z0-9]{4,12}$/;
    return regex.test(value);
  };

  const handleCodeChange = (value: string) => {
    // Convert to uppercase and remove invalid characters
    const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    setCode(cleaned);
    setAvailable(null);
  };

  const checkAvailability = async () => {
    if (!validateCode(code)) {
      showError('Code must be 4-12 uppercase letters/numbers only');
      return;
    }

    setChecking(true);
    try {
      const response = await fetch(`/api/affiliates/check-code?code=${code}`);
      const data = await response.json();
      setAvailable(data.available);
    } catch (err) {
      console.error('Error checking code:', err);
      showError('Failed to check code availability');
    } finally {
      setChecking(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      showError('You must be logged in');
      return;
    }

    if (!validateCode(code)) {
      showError('Invalid code format');
      return;
    }

    setCreating(true);
    try {
      const response = await fetch('/api/affiliates/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          code,
        }),
      });

      const data = await response.json();

      if (data.error) {
        showError(data.error);
      } else {
        success(`Affiliate code ${code} created successfully!`);
        onSuccess(code);
      }
    } catch (err) {
      console.error('Error creating affiliate:', err);
      showError('Failed to create affiliate account');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="bg-black/50 border border-white/10 rounded-none p-8">
        <h1 className="text-3xl font-bold text-white mb-4">
          Choose Your Affiliate Code
        </h1>
        <p className="text-white/70 mb-6">
          Your affiliate code is your unique identifier. Choose wisely - it cannot be changed later!
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Affiliate Code
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={code}
                  onChange={(e) => handleCodeChange(e.target.value)}
                  placeholder="YOURCODE"
                  maxLength={12}
                  className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-none text-white placeholder-white/40 focus:outline-none focus:border-white/30 font-mono text-lg"
                  disabled={creating}
                />
                {available === true && (
                  <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-400" />
                )}
                {available === false && (
                  <X className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-red-400" />
                )}
              </div>
              <button
                type="button"
                onClick={checkAvailability}
                disabled={!code || !validateCode(code) || checking}
                className="px-4 py-3 bg-white/10 border border-white/10 text-white rounded-none hover:bg-white/20 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {checking ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  'Check'
                )}
              </button>
            </div>
            <div className="mt-2 text-sm text-white/60">
              {code.length > 0 && (
                <span>{code.length}/12 characters</span>
              )}
            </div>
          </div>

          {available === false && (
            <div className="flex items-center gap-2 text-red-400 text-sm">
              <AlertCircle className="w-4 h-4" />
              <span>This code is already taken. Try another.</span>
            </div>
          )}

          {available === true && (
            <div className="flex items-center gap-2 text-green-400 text-sm">
              <Check className="w-4 h-4" />
              <span>This code is available!</span>
            </div>
          )}

          <div className="bg-white/5 border border-white/10 rounded-none p-4">
            <h3 className="text-white font-semibold mb-2">Code Requirements:</h3>
            <ul className="text-white/60 text-sm space-y-1">
              <li>• 4-12 characters long</li>
              <li>• Uppercase letters (A-Z) and numbers (0-9) only</li>
              <li>• Must be unique</li>
              <li>• Cannot be changed after creation</li>
            </ul>
          </div>

          <button
            type="submit"
            disabled={!code || !validateCode(code) || available !== true || creating}
            className="w-full px-6 py-3 bg-white text-black font-semibold rounded-none hover:bg-white/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {creating ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                Creating...
              </span>
            ) : (
              'Create Affiliate Account'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}



