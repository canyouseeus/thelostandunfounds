/**
 * Resend Email Handler
 * Handles sending emails via Resend API
 * 
 * Resend Free Tier: 10,000 emails/month, 100 emails/day
 * Much better than Zoho's ~50/day limit!
 */

interface ResendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
  cc?: string | string[];
  bcc?: string | string[];
}

interface ResendResponse {
  id?: string;
  error?: {
    message: string;
    name: string;
  };
}

const RESEND_API_URL = 'https://api.resend.com/emails';

/**
 * Send a single email via Resend
 */
export async function sendEmail(params: ResendEmailParams): Promise<{ success: boolean; id?: string; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  
  if (!apiKey) {
    return { success: false, error: 'Resend API key not configured' };
  }

  const fromEmail = params.from || process.env.RESEND_FROM_EMAIL || 'noreply@thelostandunfounds.com';

  try {
    const response = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: params.to,
        subject: params.subject,
        html: params.html,
        reply_to: params.replyTo,
        cc: params.cc,
        bcc: params.bcc,
      }),
    });

    const data: ResendResponse = await response.json();

    if (!response.ok) {
      console.error('Resend API error:', data);
      return { 
        success: false, 
        error: data.error?.message || `Resend error: ${response.status}` 
      };
    }

    return { success: true, id: data.id };
  } catch (error: any) {
    console.error('Resend send error:', error);
    return { success: false, error: error.message || 'Failed to send email' };
  }
}

/**
 * Send batch emails via Resend (up to 100 per request)
 */
export async function sendBatchEmails(
  emails: Array<{ to: string; subject: string; html: string }>
): Promise<{ success: boolean; results: Array<{ to: string; success: boolean; id?: string; error?: string }> }> {
  const apiKey = process.env.RESEND_API_KEY;
  
  if (!apiKey) {
    return { 
      success: false, 
      results: emails.map(e => ({ to: e.to, success: false, error: 'Resend API key not configured' }))
    };
  }

  const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@thelostandunfounds.com';
  const results: Array<{ to: string; success: boolean; id?: string; error?: string }> = [];

  // Resend batch API supports up to 100 emails per request
  const batchSize = 100;
  
  for (let i = 0; i < emails.length; i += batchSize) {
    const batch = emails.slice(i, i + batchSize);
    
    try {
      const response = await fetch('https://api.resend.com/emails/batch', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(
          batch.map(email => ({
            from: fromEmail,
            to: email.to,
            subject: email.subject,
            html: email.html,
          }))
        ),
      });

      const data = await response.json();

      if (!response.ok) {
        // Batch failed, mark all as failed
        batch.forEach(email => {
          results.push({
            to: email.to,
            success: false,
            error: data.error?.message || `Batch error: ${response.status}`,
          });
        });
      } else {
        // Batch succeeded
        const batchResults = data.data || [];
        batch.forEach((email, index) => {
          const result = batchResults[index];
          if (result?.id) {
            results.push({ to: email.to, success: true, id: result.id });
          } else {
            results.push({ to: email.to, success: false, error: 'No ID returned' });
          }
        });
      }
    } catch (error: any) {
      // Network error, mark batch as failed
      batch.forEach(email => {
        results.push({
          to: email.to,
          success: false,
          error: error.message || 'Network error',
        });
      });
    }

    // Small delay between batches to be nice to the API
    if (i + batchSize < emails.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  const allSuccess = results.every(r => r.success);
  return { success: allSuccess, results };
}

/**
 * Check if Resend is configured
 */
export function isResendConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}
