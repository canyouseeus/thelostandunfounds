/**
 * Sends a reply to Zayaan Ali (Toke Truck) confirming deposit receipt
 * and requesting the $150 balance owed.
 *
 * Invoice: TokeTruck_Invoice_April18
 *   Total:   $300
 *   Deposit: $150 ✓ (paid)
 *   Balance: $150 (due)
 *
 * Run: npx tsx scripts/send-toketruck-reply.ts
 */

import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { getZohoAuthContext, sendZohoEmail } from '../lib/api-handlers/_zoho-email-utils.js'

const TO = 'info@toketruck.com'
const SUBJECT = 'Re: April 18 Shoot — Balance Due | THE LOST+UNFOUNDS'

const html = `
<div style="background:#000; color:#fff; font-family: Arial, Helvetica, sans-serif; padding: 0;">
  <p style="font-size:16px; line-height:1.7; color:#fff; margin:0 0 20px 0;">
    Hey Zayaan,
  </p>
  <p style="font-size:16px; line-height:1.7; color:#fff; margin:0 0 20px 0;">
    Thanks for being understanding — definitely wasn't ideal out there, but we made it work.
    Appreciate you being down to reschedule when the weather cooperates; we'll lock something in.
  </p>
  <p style="font-size:16px; line-height:1.7; color:#fff; margin:0 0 20px 0;">
    Deposit is confirmed received — thank you. The remaining
    <strong style="color:#fff;">$150 balance</strong> is now due for the session.
    Once that's cleared we'll get the deliverables finalized and sent over.
  </p>

  <!-- Payment box -->
  <div style="border-left: 3px solid #fff; padding: 16px 20px; margin: 28px 0; background: rgba(255,255,255,0.04);">
    <p style="font-size:11px; font-weight:900; text-transform:uppercase; letter-spacing:0.15em; color:rgba(255,255,255,0.4); margin:0 0 12px 0;">
      Payment — $150 Balance
    </p>
    <p style="font-size:14px; color:#fff; margin:0 0 6px 0;"><strong>Venmo</strong> · @thelostandunfounds</p>
    <p style="font-size:14px; color:#fff; margin:0 0 6px 0;"><strong>Cash App</strong> · $ILLKID24</p>
    <p style="font-size:14px; color:#fff; margin:0 0 6px 0;"><strong>Apple Pay</strong> · 737-296-1598</p>
    <p style="font-size:14px; color:#fff; margin:0 0 4px 0;"><strong>Bitcoin</strong> (preferred)</p>
    <p style="font-size:12px; color:rgba(255,255,255,0.55); word-break:break-all; margin:0;">
      bc1qpr8hj6t3cjrwyfpeyugdzm64pmxz95tan08fdc
    </p>
  </div>

  <p style="font-size:16px; line-height:1.7; color:#fff; margin:0 0 20px 0;">
    Let me know once it's sent and we'll go from there. Looking forward to getting the makeup session on the books.
  </p>
  <p style="font-size:16px; line-height:1.7; color:#fff; margin:0;">
    — THE LOST+UNFOUNDS<br>
    <span style="color:rgba(255,255,255,0.4); font-size:13px;">media@thelostandunfounds.com</span>
  </p>
</div>
`

async function main() {
  console.log('Getting Zoho auth...')
  const auth = await getZohoAuthContext()
  console.log('Auth OK — sending from:', auth.fromEmail)

  const result = await sendZohoEmail({ auth, to: TO, subject: SUBJECT, htmlContent: html })

  if (result.success) {
    console.log('✅  Reply sent to', TO)
  } else {
    console.error('❌  Failed to send:', result.error)
    process.exit(1)
  }
}

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
