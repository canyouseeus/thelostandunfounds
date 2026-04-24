/**
 * Photography Services Contract Email Template
 *
 * Uses the same brand banner as all other emails (black background, Supabase PNG).
 * The contract data is presented in a white card below the banner for legibility.
 */

const BRAND_BANNER = 'https://nonaqhllakrckbtbawrb.supabase.co/storage/v1/object/public/brand-assets/1764772922060_IMG_1244.png'
const WEBSITE = 'https://www.thelostandunfounds.com'
const PHOTOGRAPHER_NAME = 'THE LOST+UNFOUNDS'
const PHOTOGRAPHER_EMAIL = 'media@thelostandunfounds.com'
const PHOTOGRAPHER_IG = '@tlau.photos'

export interface ContractLocation {
  name: string
  address?: string
  peakHours?: string
}

export interface ContractParams {
  clientName: string
  clientEmail: string
  eventDate: string
  locations: ContractLocation[]
  totalPrice: number
  deliverablesPerLocation: string
  notes?: string
  issueDate?: string
}

function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`
}

export function generateContract(params: ContractParams): string {
  const {
    clientName,
    clientEmail,
    eventDate,
    locations,
    totalPrice,
    deliverablesPerLocation,
    notes,
    issueDate = new Date().toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }),
  } = params

  const deposit = totalPrice / 2
  const balance = totalPrice - deposit
  const locationCount = locations.length

  const locationRows = locations
    .map(
      (loc, i) => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #e5e5e5;font-size:14px;color:#111;vertical-align:top;">
        <strong>Location ${i + 1}</strong><br>
        ${loc.name}${loc.address ? `<br><span style="color:#555;">${loc.address}</span>` : ''}
      </td>
      <td style="padding:10px 0;border-bottom:1px solid #e5e5e5;font-size:14px;color:#111;text-align:right;vertical-align:top;">
        ${loc.peakHours ? loc.peakHours : '<em style="color:#aaa;">TBD</em>'}
      </td>
    </tr>`
    )
    .join('')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Photography Services Agreement — ${PHOTOGRAPHER_NAME}</title>
  <style>
    body,table,td,p,a { -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
    table,td { mso-table-lspace:0pt; mso-table-rspace:0pt; }
    img { border:0; height:auto; line-height:100%; outline:none; text-decoration:none; -ms-interpolation-mode:bicubic; }
    body { margin:0 !important; padding:0 !important; background-color:#000000; font-family:Arial,Helvetica,sans-serif; }
  </style>
</head>
<body bgcolor="#000000" style="margin:0;padding:0;background-color:#000000;font-family:Arial,Helvetica,sans-serif;">

  <!-- Outer black wrapper -->
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" bgcolor="#000000"
    style="border-collapse:collapse;background-color:#000000;">
    <tr>
      <td align="center" bgcolor="#000000" style="padding:0;background-color:#000000;">

        <!-- 600px column -->
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" bgcolor="#000000"
          style="max-width:600px;width:100%;background-color:#000000;border-collapse:collapse;">

          <!-- ── BRAND BANNER ── -->
          <tr>
            <td align="left" bgcolor="#000000" style="padding:0;background-color:#000000;font-size:0;line-height:0;">
              <a href="${WEBSITE}" target="_blank" style="display:block;width:100%;">
                <img src="${BRAND_BANNER}" alt="${PHOTOGRAPHER_NAME}"
                  style="width:100%;max-width:600px;height:auto;display:block;border:0;" border="0">
              </a>
            </td>
          </tr>

          <!-- ── CONTRACT CARD ── -->
          <tr>
            <td align="left" bgcolor="#000000" style="padding:20px;background-color:#000000;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%"
                style="background:#ffffff;border:1px solid #d0d0d0;border-collapse:collapse;">

                <!-- Contract heading -->
                <tr>
                  <td style="padding:28px 40px 20px 40px;border-bottom:3px solid #000000;background:#ffffff;">
                    <p style="margin:0;font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:#555;font-weight:bold;">
                      Photography Services Agreement
                    </p>
                    <p style="margin:6px 0 0 0;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#888;">
                      Issued ${issueDate}
                    </p>
                  </td>
                </tr>

                <!-- Party details -->
                <tr>
                  <td style="padding:28px 40px 20px 40px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;">
                      <tr>
                        <td style="width:50%;vertical-align:top;padding-right:20px;">
                          <p style="margin:0 0 4px 0;font-size:9px;letter-spacing:0.2em;text-transform:uppercase;color:#888;">Service Provider</p>
                          <p style="margin:0 0 2px 0;font-size:14px;font-weight:bold;color:#111;">${PHOTOGRAPHER_NAME}</p>
                          <p style="margin:0;font-size:13px;color:#555;">${PHOTOGRAPHER_IG}</p>
                          <p style="margin:0;font-size:13px;color:#555;">${PHOTOGRAPHER_EMAIL}</p>
                        </td>
                        <td style="width:50%;vertical-align:top;">
                          <p style="margin:0 0 4px 0;font-size:9px;letter-spacing:0.2em;text-transform:uppercase;color:#888;">Client</p>
                          <p style="margin:0 0 2px 0;font-size:14px;font-weight:bold;color:#111;">${clientName}</p>
                          <p style="margin:0;font-size:13px;color:#555;">${clientEmail}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Divider -->
                <tr><td style="padding:0 40px;"><hr style="border:none;border-top:1px solid #e5e5e5;margin:0;"></td></tr>

                <!-- Event details -->
                <tr>
                  <td style="padding:24px 40px;">
                    <p style="margin:0 0 14px 0;font-size:11px;font-weight:bold;letter-spacing:0.15em;text-transform:uppercase;color:#111;">
                      Event Details
                    </p>
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;">
                      <tr>
                        <td style="padding:10px 0;border-bottom:1px solid #e5e5e5;font-size:14px;color:#111;width:50%;"><strong>Event Date</strong></td>
                        <td style="padding:10px 0;border-bottom:1px solid #e5e5e5;font-size:14px;color:#111;text-align:right;">${eventDate}</td>
                      </tr>
                      <tr>
                        <td style="padding:10px 0;border-bottom:1px solid #e5e5e5;font-size:14px;color:#111;"><strong>Number of Locations</strong></td>
                        <td style="padding:10px 0;border-bottom:1px solid #e5e5e5;font-size:14px;color:#111;text-align:right;">${locationCount}</td>
                      </tr>
                      <tr>
                        <td style="padding:10px 0;border-bottom:1px solid #e5e5e5;font-size:14px;color:#111;"><strong>Deliverables per Location</strong></td>
                        <td style="padding:10px 0;border-bottom:1px solid #e5e5e5;font-size:14px;color:#111;text-align:right;">${deliverablesPerLocation}</td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Locations & peak hours -->
                <tr>
                  <td style="padding:0 40px 24px 40px;">
                    <p style="margin:0 0 14px 0;font-size:11px;font-weight:bold;letter-spacing:0.15em;text-transform:uppercase;color:#111;">
                      Locations &amp; Peak Hours
                    </p>
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;">
                      <tr>
                        <th style="padding:8px 0;border-bottom:2px solid #111;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#555;text-align:left;">Location</th>
                        <th style="padding:8px 0;border-bottom:2px solid #111;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#555;text-align:right;">Peak Hours</th>
                      </tr>
                      ${locationRows}
                    </table>
                    <p style="margin:10px 0 0 0;font-size:12px;color:#888;font-style:italic;">
                      Time split evenly between all ${locationCount} location${locationCount > 1 ? 's' : ''}. Schedule subject to peak hour confirmation.
                    </p>
                  </td>
                </tr>

                <!-- Payment -->
                <tr>
                  <td style="padding:0 40px 24px 40px;">
                    <p style="margin:0 0 14px 0;font-size:11px;font-weight:bold;letter-spacing:0.15em;text-transform:uppercase;color:#111;">
                      Payment Schedule
                    </p>
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;">
                      <tr>
                        <td style="padding:10px 0;border-bottom:1px solid #e5e5e5;font-size:14px;color:#111;">
                          <strong>Deposit Due Now</strong><br>
                          <span style="font-size:12px;color:#555;">Required to secure your booking</span>
                        </td>
                        <td style="padding:10px 0;border-bottom:1px solid #e5e5e5;font-size:14px;font-weight:bold;color:#111;text-align:right;">${formatCurrency(deposit)}</td>
                      </tr>
                      <tr>
                        <td style="padding:10px 0;border-bottom:1px solid #e5e5e5;font-size:14px;color:#111;">
                          <strong>Balance Due Day-Of</strong><br>
                          <span style="font-size:12px;color:#555;">Paid before or upon arrival</span>
                        </td>
                        <td style="padding:10px 0;border-bottom:1px solid #e5e5e5;font-size:14px;color:#111;text-align:right;">${formatCurrency(balance)}</td>
                      </tr>
                      <tr>
                        <td style="padding:12px 0 0 0;font-size:15px;font-weight:bold;color:#111;">Total</td>
                        <td style="padding:12px 0 0 0;font-size:15px;font-weight:bold;color:#111;text-align:right;">${formatCurrency(totalPrice)}</td>
                      </tr>
                    </table>

                    <p style="margin:20px 0 10px 0;font-size:11px;font-weight:bold;letter-spacing:0.15em;text-transform:uppercase;color:#111;">
                      Accepted Payment Methods
                    </p>
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;">
                      <tr>
                        <td style="padding:9px 0;border-bottom:1px solid #e5e5e5;font-size:13px;color:#111;width:36%;">
                          <strong>Bitcoin</strong> <span style="font-size:10px;color:#fff;background:#111;padding:2px 6px;letter-spacing:0.08em;text-transform:uppercase;">Preferred</span>
                        </td>
                        <td style="padding:9px 0;border-bottom:1px solid #e5e5e5;font-size:12px;color:#555;word-break:break-all;">
                          bc1qpr8hj6t3cjrwyfpeyugdzm64pmxz95tan08fdc
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:9px 0;border-bottom:1px solid #e5e5e5;font-size:13px;color:#111;"><strong>Venmo</strong></td>
                        <td style="padding:9px 0;border-bottom:1px solid #e5e5e5;font-size:13px;color:#555;">
                          <a href="https://venmo.com/u/thelostandunfounds" style="color:#555;text-decoration:none;">@thelostandunfounds</a>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:9px 0;border-bottom:1px solid #e5e5e5;font-size:13px;color:#111;"><strong>Cash App</strong></td>
                        <td style="padding:9px 0;border-bottom:1px solid #e5e5e5;font-size:13px;color:#555;">
                          <a href="https://cash.app/$ILLKID24" style="color:#555;text-decoration:none;">$ILLKID24</a>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:9px 0;font-size:13px;color:#111;"><strong>Apple Pay</strong></td>
                        <td style="padding:9px 0;font-size:13px;color:#555;">737-296-1598</td>
                      </tr>
                    </table>

                    <!-- Deposit callout -->
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%"
                      style="border-collapse:collapse;margin-top:18px;background:#000;border:2px solid #000;">
                      <tr>
                        <td style="padding:16px 20px;">
                          <p style="margin:0;font-size:13px;font-weight:bold;color:#fff;letter-spacing:0.05em;text-transform:uppercase;">
                            Action Required — Pay Deposit to Lock In Your Date
                          </p>
                          <p style="margin:6px 0 0 0;font-size:13px;color:rgba(255,255,255,0.75);">
                            Your booking is <strong style="color:#fff;">not confirmed</strong> until the ${formatCurrency(deposit)} deposit
                            is received. Send payment via any method above or email
                            <a href="mailto:${PHOTOGRAPHER_EMAIL}" style="color:#fff;">${PHOTOGRAPHER_EMAIL}</a> to arrange.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Terms -->
                <tr>
                  <td style="padding:0 40px 24px 40px;">
                    <p style="margin:0 0 12px 0;font-size:11px;font-weight:bold;letter-spacing:0.15em;text-transform:uppercase;color:#111;">
                      Terms &amp; Conditions
                    </p>
                    <ol style="margin:0;padding-left:18px;font-size:13px;color:#555;line-height:1.8;">
                      <li><strong style="color:#111;">Deposit &amp; Booking:</strong> A 50% non-refundable deposit is required to secure the date. First-paid basis.</li>
                      <li><strong style="color:#111;">Balance:</strong> Remaining 50% due on the day of the shoot, before photography begins.</li>
                      <li><strong style="color:#111;">Scheduling:</strong> Time divided evenly between locations per peak-hour schedule provided by client.</li>
                      <li><strong style="color:#111;">Deliverables:</strong> ${deliverablesPerLocation} per location, delivered digitally within 5–7 business days.</li>
                      <li><strong style="color:#111;">Cancellation:</strong> Cancellations less than 48 hours before the event forfeit the deposit.</li>
                      <li><strong style="color:#111;">Usage Rights:</strong> Client receives a non-exclusive license for marketing. Photographer retains full copyright.</li>
                      <li><strong style="color:#111;">Force Majeure:</strong> Both parties agree to reschedule at the earliest mutually available date.</li>
                    </ol>
                  </td>
                </tr>

                ${notes ? `
                <tr>
                  <td style="padding:0 40px 24px 40px;">
                    <p style="margin:0 0 8px 0;font-size:11px;font-weight:bold;letter-spacing:0.15em;text-transform:uppercase;color:#111;">Notes</p>
                    <p style="margin:0;font-size:13px;color:#555;line-height:1.7;">${notes}</p>
                  </td>
                </tr>` : ''}

                <!-- Signature block -->
                <tr>
                  <td style="padding:0 40px 36px 40px;background:#fafafa;border-top:1px solid #e5e5e5;">
                    <p style="margin:24px 0 16px 0;font-size:11px;font-weight:bold;letter-spacing:0.15em;text-transform:uppercase;color:#111;">Agreement</p>
                    <p style="margin:0 0 24px 0;font-size:13px;color:#555;line-height:1.7;">
                      By paying the deposit, the client acknowledges and agrees to all terms outlined in this agreement.
                      Please reply to this email with your confirmation and peak hour details, then arrange deposit payment
                      to <strong style="color:#111;">${PHOTOGRAPHER_EMAIL}</strong>.
                    </p>
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;">
                      <tr>
                        <td style="width:50%;padding-right:20px;vertical-align:top;">
                          <div style="border-top:1px solid #111;padding-top:8px;margin-top:40px;">
                            <p style="margin:0;font-size:12px;color:#111;font-weight:bold;">${PHOTOGRAPHER_NAME}</p>
                            <p style="margin:2px 0 0 0;font-size:11px;color:#888;">Photographer / Service Provider</p>
                          </div>
                        </td>
                        <td style="width:50%;vertical-align:top;">
                          <div style="border-top:1px solid #111;padding-top:8px;margin-top:40px;">
                            <p style="margin:0;font-size:12px;color:#111;font-weight:bold;">${clientName}</p>
                            <p style="margin:2px 0 0 0;font-size:11px;color:#888;">Client / Authorized Representative</p>
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

              </table>
              <!-- /Contract card -->
            </td>
          </tr>

          <!-- ── BLACK FOOTER ── -->
          <tr>
            <td style="padding:20px;background-color:#000000;">
              <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.5);text-align:center;letter-spacing:0.1em;text-transform:uppercase;">
                ${PHOTOGRAPHER_NAME} &nbsp;·&nbsp; ${PHOTOGRAPHER_IG} &nbsp;·&nbsp;
                <a href="mailto:${PHOTOGRAPHER_EMAIL}" style="color:rgba(255,255,255,0.5);text-decoration:none;">${PHOTOGRAPHER_EMAIL}</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`
}
