/**
 * Pricing Page
 */

import { Link } from 'react-router-dom';
import { Check, ArrowRight, Zap, Crown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Pricing() {
  const { user, tier } = useAuth();

  const plans = [
    {
      name: 'Free',
      price: 0,
      period: 'forever',
      description: 'Perfect for trying out our tools',
      features: [
        '5 downloads per day',
        'Access to all basic tools',
        'Community support',
        'Standard quality downloads',
      ],
      cta: user ? 'Current Plan' : 'Get Started',
      highlight: false,
      icon: Zap,
    },
    {
      name: 'Premium',
      price: 9.99,
      period: 'month',
      description: 'For regular users and creators',
      features: [
        'Unlimited downloads',
        'Access to all tools',
        'Priority support',
        'HD quality downloads',
        'No watermarks',
      ],
      cta: tier === 'premium' ? 'Current Plan' : 'Upgrade to Premium',
      highlight: true,
      icon: Crown,
    },
    {
      name: 'Pro',
      price: 19.99,
      period: 'month',
      description: 'For developers and power users',
      features: [
        'Everything in Premium',
        'API access',
        '10,000 API requests/day',
        'Priority feature requests',
        'Direct support channel',
        'Early access to new tools',
      ],
      cta: tier === 'pro' ? 'Current Plan' : 'Upgrade to Pro',
      highlight: false,
      icon: Crown,
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-12 text-center">
        <h1 className="text-5xl font-bold text-white mb-4">Pricing</h1>
        <p className="text-xl text-white/70">
          Choose the plan that's right for you
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
        {plans.map((plan) => {
          const Icon = plan.icon;
          const isCurrentPlan = 
            (plan.name.toLowerCase() === 'free' && tier === 'free') ||
            (plan.name.toLowerCase() === 'premium' && tier === 'premium') ||
            (plan.name.toLowerCase() === 'pro' && tier === 'pro');

          return (
            <div
              key={plan.name}
              className={`bg-black border rounded-lg p-8 relative ${
                plan.highlight
                  ? 'border-yellow-400 shadow-lg shadow-yellow-400/20'
                  : 'border-white/10'
              }`}
            >
              {plan.highlight && (
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                  <span className="bg-yellow-400 text-black px-4 py-1 rounded-full text-sm font-semibold">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="text-center mb-6">
                <Icon className={`w-12 h-12 mx-auto mb-4 ${
                  plan.highlight ? 'text-yellow-400' : 'text-white/60'
                }`} />
                <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                <p className="text-white/60 text-sm mb-4">{plan.description}</p>
                <div className="mb-4">
                  <span className="text-4xl font-bold text-white">${plan.price}</span>
                  {plan.price > 0 && (
                    <span className="text-white/60">/{plan.period}</span>
                  )}
                </div>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                    <span className="text-white/80">{feature}</span>
                  </li>
                ))}
              </ul>

              {isCurrentPlan ? (
                <div className="w-full px-6 py-3 bg-white/10 text-white font-semibold rounded-lg text-center">
                  Current Plan
                </div>
              ) : (
                <Link
                  to={user ? '/settings' : '/tools'}
                  className="block w-full px-6 py-3 bg-white text-black font-semibold rounded-lg hover:bg-white/90 transition text-center"
                >
                  {plan.cta}
                </Link>
              )}
            </div>
          );
        })}
      </div>

      <div className="bg-white/5 border border-white/10 rounded-lg p-8 text-center">
        <h2 className="text-2xl font-bold text-white mb-4">Need a Custom Plan?</h2>
        <p className="text-white/70 mb-6">
          We offer custom enterprise plans for teams and organizations. Contact us to learn more.
        </p>
        <Link
          to="/contact"
          className="inline-flex items-center gap-2 px-6 py-3 bg-white text-black font-semibold rounded-lg hover:bg-white/90 transition"
        >
          Contact Sales <ArrowRight className="w-5 h-5" />
        </Link>
      </div>
    </div>
  );
}


