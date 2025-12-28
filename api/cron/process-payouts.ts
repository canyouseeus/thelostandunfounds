import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Cron Job: Process Payouts
 * Automatically processes pending payout requests
 * 
 * Set up in Vercel Cron Jobs:
 * - Schedule: Every hour (0 * * * *)
 * - Path: /api/cron/process-payouts
 * - Or call manually: POST /api/cron/process-payouts
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Verify cron secret (optional but recommended)
  const cronSecret = req.headers['x-cron-secret'] || req.query.secret;
  const expectedSecret = process.env.CRON_SECRET;

  if (expectedSecret && cronSecret !== expectedSecret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    console.log('🔄 Cron job: Processing payouts...');

    // Call the process-payouts endpoint internally
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : 'http://localhost:3000';

    const response = await fetch(`${baseUrl}/api/admin/process-payouts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Forward authorization if needed
        ...(req.headers.authorization ? { Authorization: req.headers.authorization } : {}),
      },
      body: JSON.stringify({
        processAll: true, // Process all pending payouts
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Payout processing failed:', data);
      return res.status(response.status).json(data);
    }

    console.log('✅ Payout processing completed:', {
      processed: data.processed,
      successful: data.successful,
      failed: data.failed,
    });

    return res.status(200).json({
      success: true,
      message: 'Payout processing completed',
      ...data,
    });

  } catch (error: any) {
    console.error('❌ Cron job error:', error);
    return res.status(500).json({ 
      error: 'Cron job failed', 
      message: error.message 
    });
  }
}

