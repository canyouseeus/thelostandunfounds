/**
 * Photography Services Contract Email Template
 *
 * Generates a professional HTML contract with white letterhead and black logo.
 * Sent from media@thelostandunfounds.com.
 */

const LOGO_URL = 'https://www.thelostandunfounds.com/logo.png'
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
  /** Client/company name */
  clientName: string
  /** Client email address */
  clientEmail: string
  /** Event date (e.g. "Saturday, April 19, 2026") */
  eventDate: string
  /** List of locations — time split evenly among them */
  locations: ContractLocation[]
  /** Total price in dollars (number) */
  totalPrice: number
  /** Deliverables per location (e.g. "10 photos + 1 reel") */
  deliverablesPerLocation: string
  /** Any additional notes */
  notes?: string
  /** Contract issue date (defaults to today) */
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
      <td style="padding: 10px 0; border-bottom: 1px solid #e5e5e5; font-size: 14px; color: #111; vertical-align: top;">
        <strong>Location ${i + 1}</strong><br>
        ${loc.name}${loc.address ? `<br><span style="color:#555;">${loc.address}</span>` : ''}
      </td>
      <td style="padding: 10px 0; border-bottom: 1px solid #e5e5e5; font-size: 14px; color: #111; text-align: right; vertical-align: top;">
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
  <title>Photography Services Agreement — ${PHOTOGRAPHER_NAME}</title>
</head>
<body style="margin:0; padding:0; background-color:#f4f4f4; font-family: Arial, Helvetica, sans-serif; -webkit-text-size-adjust:100%;">

  <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%; border-collapse:collapse; background-color:#f4f4f4;">
    <tr>
      <td align="center" style="padding: 40px 20px;">

        <!-- Contract card -->
        <table role="presentation" cellpadding="0" cellspacing="0"
          style="max-width:680px; width:100%; background:#ffffff; border: 1px solid #d0d0d0;">

          <!-- ── LETTERHEAD ── -->
          <tr>
            <td style="padding: 36px 48px 28px 48px; border-bottom: 3px solid #000000; background:#ffffff;">
              <a href="${WEBSITE}" style="text-decoration:none; display:block;">
                <img
                  src="${LOGO_URL}"
                  alt="${PHOTOGRAPHER_NAME}"
                  width="160"
                  style="display:block; height:auto; max-width:160px; filter:brightness(0);"
                />
              </a>
              <p style="margin:12px 0 0 0; font-size:10px; letter-spacing:0.18em; text-transform:uppercase; color:#555;">
                Photography Services Agreement
              </p>
            </td>
          </tr>

          <!-- ── PARTY DETAILS ── -->
          <tr>
            <td style="padding: 32px 48px 24px 48px;">
              <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%; border-collapse:collapse;">
                <tr>
                  <!-- Photographer -->
                  <td style="width:50%; vertical-align:top; padding-right:24px;">
                    <p style="margin:0 0 4px 0; font-size:9px; letter-spacing:0.2em; text-transform:uppercase; color:#888;">Service Provider</p>
                    <p style="margin:0 0 2px 0; font-size:14px; font-weight:bold; color:#111;">${PHOTOGRAPHER_NAME}</p>
                    <p style="margin:0; font-size:13px; color:#555;">${PHOTOGRAPHER_IG}</p>
                    <p style="margin:0; font-size:13px; color:#555;">${PHOTOGRAPHER_EMAIL}</p>
                  </td>
                  <!-- Client -->
                  <td style="width:50%; vertical-align:top;">
                    <p style="margin:0 0 4px 0; font-size:9px; letter-spacing:0.2em; text-transform:uppercase; color:#888;">Client</p>
                    <p style="margin:0 0 2px 0; font-size:14px; font-weight:bold; color:#111;">${clientName}</p>
                    <p style="margin:0; font-size:13px; color:#555;">${clientEmail}</p>
                  </td>
                </tr>
                <tr>
                  <td colspan="2" style="padding-top:20px;">
                    <p style="margin:0 0 4px 0; font-size:9px; letter-spacing:0.2em; text-transform:uppercase; color:#888;">Issue Date</p>
                    <p style="margin:0; font-size:13px; color:#111;">${issueDate}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ── DIVIDER ── -->
          <tr><td style="padding:0 48px;"><hr style="border:none; border-top:1px solid #e5e5e5; margin:0;"></td></tr>

          <!-- ── EVENT DETAILS ── -->
          <tr>
            <td style="padding: 28px 48px;">
              <p style="margin:0 0 16px 0; font-size:11px; font-weight:bold; letter-spacing:0.15em; text-transform:uppercase; color:#111;">
                Event Details
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%; border-collapse:collapse;">
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #e5e5e5; font-size:14px; color:#111; width:40%;">
                    <strong>Event Date</strong>
                  </td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #e5e5e5; font-size:14px; color:#111; text-align:right;">
                    ${eventDate}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #e5e5e5; font-size:14px; color:#111;">
                    <strong>Coverage Type</strong>
                  </td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #e5e5e5; font-size:14px; color:#111; text-align:right;">
                    Multi-Location Shoot
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #e5e5e5; font-size:14px; color:#111;">
                    <strong>Number of Locations</strong>
                  </td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #e5e5e5; font-size:14px; color:#111; text-align:right;">
                    ${locationCount}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #e5e5e5; font-size:14px; color:#111;">
                    <strong>Deliverables per Location</strong>
                  </td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #e5e5e5; font-size:14px; color:#111; text-align:right;">
                    ${deliverablesPerLocation}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ── LOCATIONS & PEAK HOURS ── -->
          <tr>
            <td style="padding: 0 48px 28px 48px;">
              <p style="margin:0 0 16px 0; font-size:11px; font-weight:bold; letter-spacing:0.15em; text-transform:uppercase; color:#111;">
                Locations &amp; Peak Hours
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%; border-collapse:collapse;">
                <tr>
                  <th style="padding: 8px 0; border-bottom: 2px solid #111; font-size:11px; letter-spacing:0.1em; text-transform:uppercase; color:#555; text-align:left;">Location</th>
                  <th style="padding: 8px 0; border-bottom: 2px solid #111; font-size:11px; letter-spacing:0.1em; text-transform:uppercase; color:#555; text-align:right;">Peak Hours</th>
                </tr>
                ${locationRows}
              </table>
              <p style="margin:12px 0 0 0; font-size:12px; color:#888; font-style:italic;">
                Time will be split evenly between all ${locationCount} location${locationCount > 1 ? 's' : ''}. Exact schedule subject to peak hour confirmation.
              </p>
            </td>
          </tr>

          <!-- ── PAYMENT ── -->
          <tr>
            <td style="padding: 0 48px 28px 48px;">
              <p style="margin:0 0 16px 0; font-size:11px; font-weight:bold; letter-spacing:0.15em; text-transform:uppercase; color:#111;">
                Payment Schedule
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%; border-collapse:collapse;">
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #e5e5e5; font-size:14px; color:#111;">
                    <strong>Deposit Due Now</strong><br>
                    <span style="font-size:12px; color:#555;">Required to secure your booking</span>
                  </td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #e5e5e5; font-size:14px; font-weight:bold; color:#111; text-align:right;">
                    ${formatCurrency(deposit)}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #e5e5e5; font-size:14px; color:#111;">
                    <strong>Balance Due Day-Of</strong><br>
                    <span style="font-size:12px; color:#555;">Paid before or upon arrival</span>
                  </td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #e5e5e5; font-size:14px; color:#111; text-align:right;">
                    ${formatCurrency(balance)}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 0 0 0; font-size:15px; font-weight:bold; color:#111;">
                    Total
                  </td>
                  <td style="padding: 12px 0 0 0; font-size:15px; font-weight:bold; color:#111; text-align:right;">
                    ${formatCurrency(totalPrice)}
                  </td>
                </tr>
              </table>

              <!-- Deposit callout box -->
              <table role="presentation" cellpadding="0" cellspacing="0"
                style="width:100%; border-collapse:collapse; margin-top:20px; background:#000; border:2px solid #000;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <p style="margin:0; font-size:13px; font-weight:bold; color:#ffffff; letter-spacing:0.05em; text-transform:uppercase;">
                      Action Required — Pay Deposit to Lock In Your Date
                    </p>
                    <p style="margin:6px 0 0 0; font-size:13px; color:rgba(255,255,255,0.75);">
                      Your booking is <strong style="color:#fff;">not confirmed</strong> until the ${formatCurrency(deposit)} deposit
                      is received. Reach out to <a href="mailto:${PHOTOGRAPHER_EMAIL}" style="color:#fff;">${PHOTOGRAPHER_EMAIL}</a>
                      to arrange payment.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ── TERMS ── -->
          <tr>
            <td style="padding: 0 48px 28px 48px;">
              <p style="margin:0 0 14px 0; font-size:11px; font-weight:bold; letter-spacing:0.15em; text-transform:uppercase; color:#111;">
                Terms &amp; Conditions
              </p>
              <ol style="margin:0; padding-left:18px; font-size:13px; color:#555; line-height:1.8;">
                <li><strong style="color:#111;">Deposit &amp; Booking:</strong> A 50% non-refundable deposit is required to secure the date. The date is held on a first-paid basis.</li>
                <li><strong style="color:#111;">Balance:</strong> The remaining 50% balance is due on the day of the shoot, before photography begins.</li>
                <li><strong style="color:#111;">Scheduling:</strong> Time will be divided evenly between locations. Photographer will move between locations based on peak-hour schedule provided by client.</li>
                <li><strong style="color:#111;">Deliverables:</strong> ${deliverablesPerLocation} per location, delivered digitally within 5–7 business days via a private online gallery.</li>
                <li><strong style="color:#111;">Cancellation:</strong> Cancellations made less than 48 hours before the event forfeit the deposit. Reschedules require at least 48 hours notice.</li>
                <li><strong style="color:#111;">Usage Rights:</strong> Client receives a non-exclusive license to use delivered content for marketing purposes. Photographer retains full copyright and the right to use images in their portfolio.</li>
                <li><strong style="color:#111;">Weather / Force Majeure:</strong> In the event of conditions outside either party's control, both parties agree to reschedule at the earliest mutually available date.</li>
              </ol>
            </td>
          </tr>

          ${notes ? `
          <!-- ── NOTES ── -->
          <tr>
            <td style="padding: 0 48px 28px 48px;">
              <p style="margin:0 0 8px 0; font-size:11px; font-weight:bold; letter-spacing:0.15em; text-transform:uppercase; color:#111;">
                Notes
              </p>
              <p style="margin:0; font-size:13px; color:#555; line-height:1.7;">${notes}</p>
            </td>
          </tr>` : ''}

          <!-- ── SIGNATURE BLOCK ── -->
          <tr>
            <td style="padding: 0 48px 40px 48px; background:#fafafa; border-top: 1px solid #e5e5e5;">
              <p style="margin:28px 0 20px 0; font-size:11px; font-weight:bold; letter-spacing:0.15em; text-transform:uppercase; color:#111;">
                Agreement
              </p>
              <p style="margin:0 0 28px 0; font-size:13px; color:#555; line-height:1.7;">
                By paying the deposit, the client acknowledges and agrees to all terms outlined in this agreement.
                Please reply to this email with your confirmation and peak hour details, then arrange deposit payment
                to <strong style="color:#111;">${PHOTOGRAPHER_EMAIL}</strong>.
              </p>

              <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%; border-collapse:collapse;">
                <tr>
                  <!-- Photographer sig -->
                  <td style="width:50%; padding-right:24px; vertical-align:top;">
                    <div style="border-top: 1px solid #111; padding-top:8px; margin-top:40px;">
                      <p style="margin:0; font-size:12px; color:#111; font-weight:bold;">${PHOTOGRAPHER_NAME}</p>
                      <p style="margin:2px 0 0 0; font-size:11px; color:#888;">Photographer / Service Provider</p>
                    </div>
                  </td>
                  <!-- Client sig -->
                  <td style="width:50%; vertical-align:top;">
                    <div style="border-top: 1px solid #111; padding-top:8px; margin-top:40px;">
                      <p style="margin:0; font-size:12px; color:#111; font-weight:bold;">${clientName}</p>
                      <p style="margin:2px 0 0 0; font-size:11px; color:#888;">Client / Authorized Representative</p>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ── FOOTER ── -->
          <tr>
            <td style="padding: 20px 48px; border-top: 3px solid #000; background:#000;">
              <p style="margin:0; font-size:11px; color:rgba(255,255,255,0.5); text-align:center; letter-spacing:0.1em; text-transform:uppercase;">
                ${PHOTOGRAPHER_NAME} &nbsp;·&nbsp; ${PHOTOGRAPHER_IG} &nbsp;·&nbsp;
                <a href="mailto:${PHOTOGRAPHER_EMAIL}" style="color:rgba(255,255,255,0.5); text-decoration:none;">${PHOTOGRAPHER_EMAIL}</a>
              </p>
            </td>
          </tr>

        </table>
        <!-- /Contract card -->

      </td>
    </tr>
  </table>

</body>
</html>`
}
