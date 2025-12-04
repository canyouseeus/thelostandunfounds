import type { VercelRequest, VercelResponse } from '@vercel/node';

// Handler map with dynamic imports for Vercel compatibility
const handlerMap: Record<string, string> = {
  'award-points': '../../lib/api-handlers/affiliates/award-points.js',
  'calculate-commission': '../../lib/api-handlers/affiliates/calculate-commission.js',
  'check-customer': '../../lib/api-handlers/affiliates/check-customer.js',
  'dashboard': '../../lib/api-handlers/affiliates/dashboard.js',
  'distribute-secret-santa': '../../lib/api-handlers/affiliates/distribute-secret-santa.js',
  'generate-discount': '../../lib/api-handlers/affiliates/generate-discount.js',
  'mlm-dashboard': '../../lib/api-handlers/affiliates/mlm-dashboard.js',
  'mlm-earnings': '../../lib/api-handlers/affiliates/mlm-earnings.js',
  'payout-settings': '../../lib/api-handlers/affiliates/payout-settings.js',
  'request-payout': '../../lib/api-handlers/affiliates/request-payout.js',
  'points-history': '../../lib/api-handlers/affiliates/points-history.js',
  'referrals': '../../lib/api-handlers/affiliates/referrals.js',
  'secret-santa': '../../lib/api-handlers/affiliates/secret-santa.js',
  'setup': '../../lib/api-handlers/affiliates/setup.js',
  'switch-mode': '../../lib/api-handlers/affiliates/switch-mode.js',
  'track-customer': '../../lib/api-handlers/affiliates/track-customer.js',
  'update-code': '../../lib/api-handlers/affiliates/update-code.js',
  'use-discount': '../../lib/api-handlers/affiliates/use-discount.js',
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

    const handlerPath = handlerMap[action];

    if (!handlerPath) {
      console.error(`Action not found: ${action}`);
      return res.status(404).json({ error: 'Action not found', action });
    }

    console.log(`Loading handler for action "${action}" from path: ${handlerPath}`);

    // Dynamically import handler for Vercel compatibility
    // Try both .js and .ts extensions
    let handlerModule;
    try {
      handlerModule = await import(handlerPath);
    } catch (importError: any) {
      // Try with .ts extension if .js fails
      const tsPath = handlerPath.replace('.js', '.ts');
      try {
        handlerModule = await import(tsPath);
      } catch (tsError: any) {
        console.error(`Failed to import handler from both paths:`, {
          jsPath: handlerPath,
          tsPath: tsPath,
          jsError: importError?.message,
          tsError: tsError?.message
        });
        throw importError;
      }
    }

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


