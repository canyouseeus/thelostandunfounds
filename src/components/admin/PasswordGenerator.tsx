/**
 * Password Generator Component
 * Generate secure temporary passwords for users
 */

import { useState } from 'react';
import { Key, Copy, Check, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { useToast } from '../Toast';
import { generateTempPassword, generateMemorablePassword, checkPasswordStrength } from '../../utils/passwordGenerator';

export default function PasswordGenerator() {
  const { success } = useToast();
  const [password, setPassword] = useState('');
  const [length, setLength] = useState(16);
  const [includeSpecial, setIncludeSpecial] = useState(true);
  const [passwordType, setPasswordType] = useState<'secure' | 'memorable'>('secure');
  const [copied, setCopied] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const generatePassword = () => {
    const newPassword = passwordType === 'secure'
      ? generateTempPassword(length, includeSpecial)
      : generateMemorablePassword(3);
    setPassword(newPassword);
    setCopied(false);
  };

  const copyToClipboard = async () => {
    if (!password) return;
    
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      success('Password copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const strength = password ? checkPasswordStrength(password) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Key className="w-6 h-6" />
          Password Generator
        </h2>
      </div>

      {/* Settings */}
      <div className="bg-black border border-white/10 rounded-lg p-6">
        <div className="space-y-4">
          <div>
            <label className="block text-white/80 mb-2">Password Type</label>
            <div className="flex gap-4">
              <button
                onClick={() => {
                  setPasswordType('secure');
                  setPassword('');
                }}
                className={`px-4 py-2 rounded-lg transition ${
                  passwordType === 'secure'
                    ? 'bg-white text-black'
                    : 'bg-white/10 text-white/60 hover:bg-white/20'
                }`}
              >
                Secure (Random)
              </button>
              <button
                onClick={() => {
                  setPasswordType('memorable');
                  setPassword('');
                }}
                className={`px-4 py-2 rounded-lg transition ${
                  passwordType === 'memorable'
                    ? 'bg-white text-black'
                    : 'bg-white/10 text-white/60 hover:bg-white/20'
                }`}
              >
                Memorable (Words)
              </button>
            </div>
          </div>

          {passwordType === 'secure' && (
            <>
              <div>
                <label className="block text-white/80 mb-2">
                  Length: {length} characters
                </label>
                <input
                  type="range"
                  min="8"
                  max="32"
                  value={length}
                  onChange={(e) => setLength(parseInt(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-white/40 mt-1">
                  <span>8</span>
                  <span>32</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="includeSpecial"
                  checked={includeSpecial}
                  onChange={(e) => setIncludeSpecial(e.target.checked)}
                  className="w-4 h-4"
                />
                <label htmlFor="includeSpecial" className="text-white/80">
                  Include special characters (!@#$%^&*)
                </label>
              </div>
            </>
          )}

          <button
            onClick={generatePassword}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white text-black rounded-lg hover:bg-white/90 transition font-medium"
          >
            <RefreshCw className="w-5 h-5" />
            Generate Password
          </button>
        </div>
      </div>

      {/* Generated Password */}
      {password && (
        <div className="bg-black border border-white/10 rounded-lg p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-white/80 mb-2">Generated Password</label>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    readOnly
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white font-mono text-lg pr-12"
                  />
                  <button
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/60 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <button
                  onClick={copyToClipboard}
                  className="px-4 py-3 bg-white/10 text-white rounded-lg hover:bg-white/20 transition flex items-center gap-2"
                >
                  {copied ? (
                    <>
                      <Check className="w-5 h-5 text-green-400" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-5 h-5" />
                      Copy
                    </>
                  )}
                </button>
              </div>
            </div>

            {strength && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white/80 text-sm">Strength</span>
                  <span className={`text-sm font-medium ${
                    strength.strength === 'strong' ? 'text-green-400' :
                    strength.strength === 'good' ? 'text-blue-400' :
                    strength.strength === 'fair' ? 'text-yellow-400' :
                    'text-red-400'
                  }`}>
                    {strength.strength.toUpperCase()}
                  </span>
                </div>
                <div className="w-full bg-white/5 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      strength.strength === 'strong' ? 'bg-green-400' :
                      strength.strength === 'good' ? 'bg-blue-400' :
                      strength.strength === 'fair' ? 'bg-yellow-400' :
                      'bg-red-400'
                    }`}
                    style={{ width: `${(strength.score / 6) * 100}%` }}
                  />
                </div>
                {strength.feedback.length > 0 && (
                  <div className="mt-2 text-xs text-white/60">
                    {strength.feedback.join(', ')}
                  </div>
                )}
              </div>
            )}

            <div className="pt-4 border-t border-white/10">
              <p className="text-white/60 text-sm">
                <strong className="text-white">Security Note:</strong> This password is generated client-side and is not stored anywhere. 
                Share it securely with the user and recommend they change it after first login.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Usage Instructions */}
      <div className="bg-black border border-white/10 rounded-lg p-6">
        <h3 className="text-lg font-bold text-white mb-3">How to Use</h3>
        <ol className="list-decimal list-inside space-y-2 text-white/60 text-sm">
          <li>Select password type (Secure or Memorable)</li>
          <li>Adjust settings if using Secure password</li>
          <li>Click "Generate Password"</li>
          <li>Copy the password and share it securely with the user</li>
          <li>User should change password after first login</li>
        </ol>
      </div>
    </div>
  );
}
