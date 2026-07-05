import { useAuth } from '../../contexts/AuthContext';
import { subscriptionService } from '../../services/subscription';
import { useState, useEffect } from 'react';

export default function SubscriptionStatus() {
  const { user, tier } = useAuth();
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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
      <div className="px-4 py-2 bg-black/50 border border-white rounded-none">
        <div className="text-white/60 text-sm">Loading subscription...</div>
      </div>
    );
  }

  const tierInfo = {
    free: {
      label: 'Free',
      color: 'text-white/60',
      bg: 'bg-white/5',
      border: 'border-white',
      description: 'Limited access to all tools',
    },
    premium: {
      label: 'Premium',
      color: 'text-yellow-400',
      bg: 'bg-yellow-400/10',
      border: 'border-white',
      description: 'Unlimited access to all tools',
    },
    pro: {
      label: 'Pro',
      color: 'text-purple-400',
      bg: 'bg-purple-400/10',
      border: 'border-white',
      description: 'Everything + API access',
    },
  };

  const info = tierInfo[tier];

  return (
    <div className={`px-4 py-3 bg-black/50 border ${info.border} rounded-none`}>
      <div className="flex items-center justify-between">
        <div className="text-center flex-1">
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
    </div>
  );
}

