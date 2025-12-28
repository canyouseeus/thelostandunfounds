import { useState } from 'react';
import { Check, Copy, Tag } from 'lucide-react';

interface DiscountCodeDisplayProps {
  affiliateCode: string;
  discountPercent: number;
  creditBalance: number;
  isActive: boolean;
}

export default function DiscountCodeDisplay({ affiliateCode, discountPercent, creditBalance, isActive }: DiscountCodeDisplayProps) {
  const [copied, setCopied] = useState(false);

  const discountCode = `${affiliateCode}-EMPLOYEE`;

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(discountCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  if (!isActive) {
    return (
      <div className="bg-black/50 border-2 border-white/20 rounded-none p-6 opacity-50">
        <div className="flex items-center gap-3 mb-4">
          <Tag className="text-white/40" size={24} />
          <h3 className="text-xl font-bold text-white/40">Employee Discount (Inactive)</h3>
        </div>
        <p className="text-white/60 text-sm">Switch to Discount Mode to activate your employee discount code</p>
      </div>
    );
  }

  return (
    <div className="bg-black/50 border-2 border-green-400 rounded-none p-6">
      <div className="flex items-center gap-3 mb-4">
        <Tag className="text-green-400" size={24} />
        <h3 className="text-xl font-bold text-white">Employee Discount</h3>
        <span className="bg-green-400/20 text-green-400 text-xs px-2 py-1 rounded-none">ACTIVE</span>
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

      {/* Credit Balance */}
      <div className="bg-green-400/10 border border-green-400/30 rounded-none p-4 mb-6">
        <p className="text-green-400 text-sm mb-1">Available Credit Balance</p>
        <p className="text-white text-3xl font-bold">${creditBalance.toFixed(2)}</p>
      </div>

      {/* Discount Info */}
      <div className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-white/60">Discount Rate:</span>
          <span className="text-white font-bold">{discountPercent}%</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-white/60">Applied On:</span>
          <span className="text-white font-medium">Profit (not price)</span>
        </div>
      </div>

      {/* Usage Instructions */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-none p-4 mt-6">
        <h4 className="text-blue-400 font-medium mb-2">💡 How to Use</h4>
        <ul className="text-white/80 text-sm space-y-1 list-disc list-inside">
          <li>Use code <span className="font-mono font-bold text-white">{discountCode}</span> at checkout</li>
          <li>Discount is {discountPercent}% of profit (not retail price)</li>
          <li>Credit accumulates with each discounted purchase</li>
          <li>Your upline still earns MLM bonuses on remaining profit</li>
        </ul>
      </div>
    </div>
  );
}



