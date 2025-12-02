import type { VercelRequest, VercelResponse } from '@vercel/node';

// Import handlers
import awardPoints from '../../lib/api-handlers/affiliates/award-points';
import calculateCommission from '../../lib/api-handlers/affiliates/calculate-commission';
import checkCustomer from '../../lib/api-handlers/affiliates/check-customer';
import distributeSecretSanta from '../../lib/api-handlers/affiliates/distribute-secret-santa';
import generateDiscount from '../../lib/api-handlers/affiliates/generate-discount';
import mlmDashboard from '../../lib/api-handlers/affiliates/mlm-dashboard';
import mlmEarnings from '../../lib/api-handlers/affiliates/mlm-earnings';
import pointsHistory from '../../lib/api-handlers/affiliates/points-history';
import referrals from '../../lib/api-handlers/affiliates/referrals';
import secretSanta from '../../lib/api-handlers/affiliates/secret-santa';
import setup from '../../lib/api-handlers/affiliates/setup';
import switchMode from '../../lib/api-handlers/affiliates/switch-mode';
import trackCustomer from '../../lib/api-handlers/affiliates/track-customer';
import updateCode from '../../lib/api-handlers/affiliates/update-code';
import useDiscount from '../../lib/api-handlers/affiliates/use-discount';

const handlers: Record<string, (req: VercelRequest, res: VercelResponse) => Promise<any>> = {
  'award-points': awardPoints,
  'calculate-commission': calculateCommission,
  'check-customer': checkCustomer,
  'distribute-secret-santa': distributeSecretSanta,
  'generate-discount': generateDiscount,
  'mlm-dashboard': mlmDashboard,
  'mlm-earnings': mlmEarnings,
  'points-history': pointsHistory,
  'referrals': referrals,
  'secret-santa': secretSanta,
  'setup': setup,
  'switch-mode': switchMode,
  'track-customer': trackCustomer,
  'update-code': updateCode,
  'use-discount': useDiscount,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { action } = req.query;

  if (!action || Array.isArray(action)) {
    return res.status(400).json({ error: 'Invalid action' });
  }

  const handlerFn = handlers[action];

  if (!handlerFn) {
    return res.status(404).json({ error: 'Action not found' });
  }

  // Remove action from query so it doesn't interfere with handlers that check query params
  // Though handlers usually look for specific keys, having extra keys shouldn't hurt.
  // However, some might iterate over query.
  
  return handlerFn(req, res);
}


