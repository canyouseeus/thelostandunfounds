import { useState, useEffect } from 'react';
import { Tag, Calendar, CheckCircle, Clock } from 'lucide-react';
import { Copy, Check } from 'lucide-react';

interface EmployeeDiscountProps {
  affiliateId: string;
  affiliateCode: string;
  creditBalance: number;
}

interface DiscountStatus {
  can_use: boolean;
  days_remaining: number;
  next_available: string | null;
  last_used: string | null;
  message: string;
}

export default function EmployeeDiscount({ affiliateId, affiliateCode, creditBalance }: EmployeeDiscountProps) {
  const [status, setStatus] = useState<DiscountStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const discountCode = `${affiliateCode}-EMPLOYEE`;

  useEffect(() => {
    fetchDiscountStatus();
  }, [affiliateId]);

  const fetchDiscountStatus = async () => {
    try {
      const response = await fetch(`/api/affiliates/use-discount?affiliate_id=${affiliateId}`);
      if (response.ok) {
        const data = await response.json();
        setStatus(data);
      }
    } catch (error) {
      console.error('Error fetching discount status:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(discountCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  if (loading) {
    return (
      <div className="bg-black/50 border-2 border-white rounded-none p-6">
        <p className="text-white/60 text-center">Loading discount status...</p>
      </div>
    );
  }

  return (
    <div className={`bg-black/50 border-2 rounded-none p-6 ${status?.can_use ? 'border-green-400' : 'border-white/20'}`}>
      <div className="flex items-center gap-3 mb-4">
        <Tag className={status?.can_use ? 'text-green-400' : 'text-white/40'} size={24} />
        <h3 className="text-xl font-bold text-white">Employee Discount</h3>
        {status?.can_use && (
          <span className="bg-green-400/20 text-green-400 text-xs px-2 py-1 rounded-none">AVAILABLE</span>
        )}
        {!status?.can_use && status && (
          <span className="bg-yellow-400/20 text-yellow-400 text-xs px-2 py-1 rounded-none">
            RESETS IN {status.days_remaining} DAYS
          </span>
        )}
      </div>

      {/* Discount Code */}
      <div className="mb-6">
        <p className="text-white/60 text-sm mb-2">Your Discount Code:</p>
        <div className="flex gap-2">
          <div className="flex-1 bg-white/10 border-2 border-white/20 rounded-none px-4 py-3 flex items-center justify-center">
            <span className="text-white text-2xl font-mono font-bold tracking-wider">{discountCode}</span>
          </div>
          <button
            onClick={copyCode}
            className="bg-white text-black px-4 py-3 rounded-none hover:bg-white/90 transition-colors"
            title="Copy code"
          >
            {copied ? <Check size={20} /> : <Copy size={20} />}
          </button>
        </div>
      </div>

      {/* Status Display */}
      {status?.can_use ? (
        <div className="bg-green-500/10 border border-green-500/30 rounded-none p-4 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="text-green-400" size={20} />
            <p className="text-green-400 font-medium">Discount Available</p>
          </div>
          <p className="text-white/80 text-sm">
            You can use your 42% employee discount on your next purchase. Use code <span className="font-mono font-bold text-white">{discountCode}</span> at checkout.
          </p>
        </div>
      ) : status ? (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-none p-4 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="text-yellow-400" size={20} />
            <p className="text-yellow-400 font-medium">Discount Resets Soon</p>
          </div>
          <div className="space-y-2">
            <p className="text-white/80 text-sm">
              You've used your discount. It resets in <span className="font-bold text-white">{status.days_remaining} days</span>.
            </p>
            {status.last_used && (
              <p className="text-white/60 text-xs">
                Last used: {new Date(status.last_used).toLocaleDateString()}
              </p>
            )}
            {status.next_available && (
              <p className="text-white/60 text-xs">
                Next available: {new Date(status.next_available).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>
      ) : null}

      {/* Credit Balance */}
      <div className="bg-white/5 border border-white/10 rounded-none p-4 mb-6">
        <p className="text-white/60 text-sm mb-1">Available Credit Balance</p>
        <p className="text-white text-3xl font-bold">${creditBalance.toFixed(2)}</p>
      </div>

      {/* How It Works */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-none p-4">
        <h4 className="text-blue-400 font-medium mb-2">💡 How Employee Discount Works</h4>
        <ul className="text-white/80 text-sm space-y-1 list-disc list-inside">
          <li>Use code <span className="font-mono font-bold text-white">{discountCode}</span> at checkout</li>
          <li>Get 42% of profit as discount credit (not cash commission)</li>
          <li>Can be used <span className="font-bold text-white">once every 30 days</span></li>
          <li>Your upline still earns MLM bonuses on remaining profit</li>
          <li>You continue earning cash commissions on all other sales</li>
        </ul>
      </div>
    </div>
  );
}



