import { useState } from 'react';
import { CheckIcon, ClipboardIcon, ShareIcon } from '@heroicons/react/24/outline';

interface ReferralLinkProps {
  affiliateCode: string;
}

export default function ReferralLink({ affiliateCode }: ReferralLinkProps) {
  const [copiedCustomer, setCopiedCustomer] = useState(false);
  const [copiedAffiliate, setCopiedAffiliate] = useState(false);

  const customerLink = `https://thelostandunfounds.com/?ref=${affiliateCode}`;
  const affiliateLink = `https://thelostandunfounds.com/become-affiliate?ref=${affiliateCode}`;

  const copyToClipboard = async (text: string, type: 'customer' | 'affiliate') => {
    try {
      await navigator.clipboard.writeText(text);

      if (type === 'customer') {
        setCopiedCustomer(true);
        setTimeout(() => setCopiedCustomer(false), 2000);
      } else {
        setCopiedAffiliate(true);
        setTimeout(() => setCopiedAffiliate(false), 2000);
      }
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const shareLink = async (url: string, title: string) => {
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch (error) {
        console.log('Share cancelled');
      }
    } else {
      copyToClipboard(url, 'customer');
    }
  };

  return (
    <div className="bg-black/50 border-2 border-white rounded-none p-6">
      <h3 className="text-xl font-bold text-white mb-4">Your Referral Links</h3>

      <div className="space-y-6">
        {/* Customer Referral Link */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-white font-medium">Customer Link</h4>
            <span className="text-white/60 text-xs">For customers to shop</span>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={customerLink}
              readOnly
              className="flex-1 bg-black/50 border border-white/20 rounded-none px-4 py-3 text-white text-sm focus:outline-none focus:border-white/40"
            />
            <button
              onClick={() => copyToClipboard(customerLink, 'customer')}
              className="bg-white text-black px-4 py-3 rounded-none hover:bg-white/90 transition-colors"
              title="Copy link"
            >
              {copiedCustomer ? <CheckIcon className="w-5 h-5" /> : <ClipboardIcon className="w-5 h-5" />}
            </button>
            <button
              onClick={() => shareLink(customerLink, 'Check out The Lost+Unfounds!')}
              className="bg-white/10 text-white border border-white/20 px-4 py-3 rounded-none hover:bg-white/20 transition-colors"
              title="Share link"
            >
              <ShareIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Affiliate Referral Link */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-white font-medium">Affiliate Link</h4>
            <span className="text-white/60 text-xs">For recruiting affiliates</span>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={affiliateLink}
              readOnly
              className="flex-1 bg-black/50 border border-white/20 rounded-none px-4 py-3 text-white text-sm focus:outline-none focus:border-white/40"
            />
            <button
              onClick={() => copyToClipboard(affiliateLink, 'affiliate')}
              className="bg-white text-black px-4 py-3 rounded-none hover:bg-white/90 transition-colors"
              title="Copy link"
            >
              {copiedAffiliate ? <CheckIcon className="w-5 h-5" /> : <ClipboardIcon className="w-5 h-5" />}
            </button>
            <button
              onClick={() => shareLink(affiliateLink, 'Join The Lost+Unfounds Affiliate Program!')}
              className="bg-white/10 text-white border border-white/20 px-4 py-3 rounded-none hover:bg-white/20 transition-colors"
              title="Share link"
            >
              <ShareIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-none p-4">
          <h4 className="text-blue-400 font-medium mb-2">💡 Pro Tips</h4>
          <ul className="text-white/80 text-sm space-y-1 list-disc list-inside">
            <li>Share customer link for 42% commission on all their purchases (forever!)</li>
            <li>Share affiliate link to earn MLM bonuses (2% Level 1, 1% Level 2)</li>
            <li>Links work forever - customers and affiliates are tied to you permanently</li>
          </ul>
        </div>
      </div>
    </div>
  );
}



