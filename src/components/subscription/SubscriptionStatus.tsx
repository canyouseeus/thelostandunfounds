import { useAuth } from '../../contexts/AuthContext';
import { subscriptionService } from '../../services/subscription';
import { useState, useEffect } from 'react';

export default function SubscriptionStatus() {
  const { user, tier } = useAuth();
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);

  useEffect(() => {
    if (user) {
      loadSubscription();
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadSubscription = async () => {
    if (!user || !user.id) return;
    setLoading(true);
    try {
      const { subscription: sub, error } = await subscriptionService.getSubscription(user.id);
      if (error) {
        console.warn('Failed to load subscription:', error);
        setSubscription(null);
      } else {
        setSubscription(sub);
      }
    } catch (error) {
      console.warn('Error loading subscription:', error);
      setSubscription(null);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  if (loading) {
    return (
      <div className="px-4 py-2 bg-black/50 border border-white/10 rounded-lg">
        <div className="text-white/60 text-sm">Loading subscription...</div>
      </div>
    );
  }

  const tierInfo = {
    free: {
      label: 'Free',
      color: 'text-white/60',
      bg: 'bg-white/5',
      border: 'border-white/10',
      description: 'Limited access to all tools',
    },
    premium: {
      label: 'Premium',
      color: 'text-yellow-400',
      bg: 'bg-yellow-400/10',
      border: 'border-yellow-400/30',
      description: 'Unlimited access to all tools',
    },
    pro: {
      label: 'Pro',
      color: 'text-purple-400',
      bg: 'bg-purple-400/10',
      border: 'border-purple-400/30',
      description: 'Everything + API access',
    },
  };

  const info = tierInfo[tier];

  return (
    <div className={`px-4 py-3 bg-black/50 border ${info.border} rounded-lg`}>
      <div className="flex items-center justify-between">
        <div>
          <div className={`text-sm font-semibold ${info.color} mb-1`}>
            {info.label} Tier
          </div>
          <div className="text-xs text-white/60 leading-relaxed">
            {info.description}
          </div>
        </div>
        {subscription?.expires_at && (
          <div className="text-xs text-white/40">
            {new Date(subscription.expires_at).toLocaleDateString()}
          </div>
        )}
      </div>
      {tier === 'free' && (
        <>
          <button 
            onClick={() => setUpgradeModalOpen(true)}
            className="mt-3 w-full px-4 py-2 bg-white text-black font-semibold rounded-lg hover:bg-white/90 transition text-sm"
          >
            Upgrade to Premium
          </button>
          
          {/* Upgrade Modal */}
          {upgradeModalOpen && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm">
              <div className="bg-black border border-white/10 rounded-lg p-6 w-full max-w-md mx-4">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-white">Upgrade Your Account</h2>
                  <button
                    onClick={() => setUpgradeModalOpen(false)}
                    className="text-white/60 hover:text-white transition"
                    aria-label="Close"
                  >
                    ✕
                  </button>
                </div>
                <div className="space-y-4">
                  <div className="bg-black border border-white/10 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-white mb-2">Premium Tier</h3>
                    <p className="text-white/70 text-sm mb-3">Unlimited access to all tools</p>
                    <div className="text-2xl font-bold text-white mb-4">$9.99<span className="text-sm text-white/60">/month</span></div>
                    <button
                      onClick={() => {
                        window.open('https://paypal.com', '_blank');
                        setUpgradeModalOpen(false);
                      }}
                      className="w-full px-4 py-2 bg-white text-black font-semibold rounded-lg hover:bg-white/90 transition"
                    >
                      Upgrade to Premium
                    </button>
                  </div>
                  <div className="bg-black border border-white/10 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-white mb-2">Pro Tier</h3>
                    <p className="text-white/70 text-sm mb-3">Everything + API access</p>
                    <div className="text-2xl font-bold text-white mb-4">$19.99<span className="text-sm text-white/60">/month</span></div>
                    <button
                      onClick={() => {
                        window.open('https://paypal.com', '_blank');
                        setUpgradeModalOpen(false);
                      }}
                      className="w-full px-4 py-2 bg-white text-black font-semibold rounded-lg hover:bg-white/90 transition"
                    >
                      Upgrade to Pro
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

