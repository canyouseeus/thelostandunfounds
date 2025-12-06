import type { VercelRequest, VercelResponse } from '@vercel/node';

type HandlerLoader = () => Promise<{ default?: (req: VercelRequest, res: VercelResponse) => any }>;

const handlerLoaders: Record<string, HandlerLoader> = {
  'award-points': () => import('../../lib/api-handlers/affiliates/award-points'),
  'calculate-commission': () => import('../../lib/api-handlers/affiliates/calculate-commission'),
  'check-customer': () => import('../../lib/api-handlers/affiliates/check-customer'),
  'dashboard': () => import('../../lib/api-handlers/affiliates/dashboard'),
  'distribute-secret-santa': () => import('../../lib/api-handlers/affiliates/distribute-secret-santa'),
  'generate-discount': () => import('../../lib/api-handlers/affiliates/generate-discount'),
  'mlm-dashboard': () => import('../../lib/api-handlers/affiliates/mlm-dashboard'),
  'mlm-earnings': () => import('../../lib/api-handlers/affiliates/mlm-earnings'),
  'payout-settings': () => import('../../lib/api-handlers/affiliates/payout-settings'),
  'request-payout': () => import('../../lib/api-handlers/affiliates/request-payout'),
  'points-history': () => import('../../lib/api-handlers/affiliates/points-history'),
  'referrals': () => import('../../lib/api-handlers/affiliates/referrals'),
  'secret-santa': () => import('../../lib/api-handlers/affiliates/secret-santa'),
  'setup': () => import('../../lib/api-handlers/affiliates/setup'),
  'switch-mode': () => import('../../lib/api-handlers/affiliates/switch-mode'),
  'track-customer': () => import('../../lib/api-handlers/affiliates/track-customer'),
  'update-code': () => import('../../lib/api-handlers/affiliates/update-code'),
  'use-discount': () => import('../../lib/api-handlers/affiliates/use-discount'),
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

    const loader = handlerLoaders[action];

    if (!loader) {
      console.error(`Action not found: ${action}`);
      return res.status(404).json({ error: 'Action not found', action });
    }

    console.log(`Loading handler for action "${action}"`);

    const handlerModule = await loader();
    const handlerFn = handlerModule.default;

    if (!handlerFn || typeof handlerFn !== 'function') {
      console.error(`Handler not found in module for action "${action}"`, {
        moduleKeys: Object.keys(handlerModule),
        hasDefault: !!handlerModule.default,
        defaultType: typeof handlerModule.default
      });
      return res.status(500).json({ error: 'Handler not found in module', action });
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


