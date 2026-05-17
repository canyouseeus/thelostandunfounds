import { useState } from 'react';
import { CheckIcon, ClipboardIcon, ShareIcon, LinkIcon, LightBulbIcon } from '@heroicons/react/24/outline';
import { AdminBentoCard } from '../ui/admin-bento-card';

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
    <AdminBentoCard
      title="Referral Links"
      icon={<LinkIcon className="w-4 h-4" />}
      colSpan={12}
      className="min-h-[200px]"
    >
      <div className="space-y-6">
        {/* Customer Referral Link */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
              Customer Link
            </label>
            <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">
              For Customers To Shop
            </span>
          </div>

          <div className="flex flex-col md:flex-row gap-2">
            <input
              type="text"
              value={customerLink}
              readOnly
              className="flex-1 bg-white/5 px-4 py-3 text-white/80 text-sm font-mono focus:outline-none"
            />
            <div className="flex gap-2">
              <button
                onClick={() => copyToClipboard(customerLink, 'customer')}
                className="px-6 py-3 bg-white text-black font-bold uppercase tracking-wider text-xs hover:bg-white/90 transition-all flex items-center gap-2 min-w-[120px] justify-center"
                title="Copy link"
              >
                {copiedCustomer ? <CheckIcon className="w-4 h-4" /> : <ClipboardIcon className="w-4 h-4" />}
                {copiedCustomer ? 'Copied' : 'Copy'}
              </button>
              <button
                onClick={() => shareLink(customerLink, 'Check out THE LOST+UNFOUNDS!')}
                className="px-4 py-3 bg-white/5 text-white hover:bg-white/10 transition-all flex items-center justify-center"
                title="Share link"
              >
                <ShareIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Affiliate Referral Link */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
              Affiliate Link
            </label>
            <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">
              For Recruiting Affiliates
            </span>
          </div>

          <div className="flex flex-col md:flex-row gap-2">
            <input
              type="text"
              value={affiliateLink}
              readOnly
              className="flex-1 bg-white/5 px-4 py-3 text-white/80 text-sm font-mono focus:outline-none"
            />
            <div className="flex gap-2">
              <button
                onClick={() => copyToClipboard(affiliateLink, 'affiliate')}
                className="px-6 py-3 bg-white text-black font-bold uppercase tracking-wider text-xs hover:bg-white/90 transition-all flex items-center gap-2 min-w-[120px] justify-center"
                title="Copy link"
              >
                {copiedAffiliate ? <CheckIcon className="w-4 h-4" /> : <ClipboardIcon className="w-4 h-4" />}
                {copiedAffiliate ? 'Copied' : 'Copy'}
              </button>
              <button
                onClick={() => shareLink(affiliateLink, 'Join THE LOST+UNFOUNDS Affiliate Program!')}
                className="px-4 py-3 bg-white/5 text-white hover:bg-white/10 transition-all flex items-center justify-center"
                title="Share link"
              >
                <ShareIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Pro Tips */}
        <div className="bg-white/[0.03] p-4">
          <h4 className="text-white text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2">
            <LightBulbIcon className="w-4 h-4 text-white/60" />
            Pro Tips
          </h4>
          <ul className="space-y-2">
            <li className="flex gap-3 text-white/60 text-xs leading-relaxed">
              <span className="text-white/30 font-mono mt-0.5">01</span>
              <span>Share customer link to earn 42% of the profit on all their purchases (forever).</span>
            </li>
            <li className="flex gap-3 text-white/60 text-xs leading-relaxed">
              <span className="text-white/30 font-mono mt-0.5">02</span>
              <span>Share affiliate link to earn MLM bonuses (2% Level 1, 1% Level 2).</span>
            </li>
            <li className="flex gap-3 text-white/60 text-xs leading-relaxed">
              <span className="text-white/30 font-mono mt-0.5">03</span>
              <span>Links work forever — customers and affiliates are tied to you permanently.</span>
            </li>
          </ul>
        </div>
      </div>
    </AdminBentoCard>
  );
}
