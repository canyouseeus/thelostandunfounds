import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  awardPoints,
  calculateCommission,
  checkCustomer,
  dashboard,
  distributeSecretSanta,
  generateDiscount,
  mlmDashboard,
  mlmEarnings,
  payoutSettings,
  requestPayout,
  pointsHistory,
  referrals,
  secretSanta,
  setupAffiliate,
  switchMode,
  trackCustomer,
  updateCode,
  useDiscount
} from '../../lib/api-handlers/affiliates/index.js';

type HandlerFn = (req: VercelRequest, res: VercelResponse) => Promise<any>;

const handlerMap: Record<string, HandlerFn> = {
  'award-points': awardPoints,
  'calculate-commission': calculateCommission,
  'check-customer': checkCustomer,
  'dashboard': dashboard,
  'distribute-secret-santa': distributeSecretSanta,
  'generate-discount': generateDiscount,
  'mlm-dashboard': mlmDashboard,
  'mlm-earnings': mlmEarnings,
  'payout-settings': payoutSettings,
  'request-payout': requestPayout,
  'points-history': pointsHistory,
  'referrals': referrals,
  'secret-santa': secretSanta,
  'setup': setupAffiliate,
  'switch-mode': switchMode,
  'track-customer': trackCustomer,
  'update-code': updateCode,
  'use-discount': useDiscount,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { action } = req.query;

    if (!action || Array.isArray(action)) {
      return res.status(400).json({ error: 'Invalid action' });
    }

    const handlerFn = handlerMap[action];

    if (!handlerFn) {
      console.error(`Action not found: ${action}`);
      return res.status(404).json({ error: 'Action not found', action });
    }

    return handlerFn(req, res);
  } catch (error: any) {
    console.error(`Error loading handler for action "${req.query.action}":`, {
      error: error?.message,
      stack: error?.stack,
      action: req.query.action
    });
    return res.status(500).json({ 
      error: 'Failed to load handler',
      message: error?.message || 'Unknown error',
      action: req.query.action,
      details: process.env.NODE_ENV === 'development' ? error?.stack : undefined
    });
  }
}


