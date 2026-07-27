/**
 * Newsletter: "A direct way to support the work"
 *
 * Announces the new /pay page to the newsletter list. Deliberately low-pressure:
 * nothing on the site is moving behind a paywall, so the ask is framed as
 * optional and stated once.
 *
 * SAFETY: this script cannot send by accident. Default is a dry run that writes
 * the rendered HTML to disk for review. Sending requires --send AND an explicit
 * --confirm flag, plus the usual ZOHO/RESEND credentials in the environment.
 *
 *   npx tsx scripts/newsletter-support-announcement.ts                  # render only
 *   npx tsx scripts/newsletter-support-announcement.ts --to me@x.com    # render for one address
 *   npx tsx scripts/newsletter-support-announcement.ts --to me@x.com --send --confirm
 */

import { writeFileSync } from 'node:fs'
import { generateNewsletterEmail, EMAIL_STYLES } from '../lib/email-template.js'

export const SUBJECT = 'A direct way to support the work'

const PAY_URL = 'https://www.thelostandunfounds.com/pay'

export function buildBody(): string {
    return `
  <h1 style="${EMAIL_STYLES.heading1}">SUPPORT THE WORK</h1>

  <p style="${EMAIL_STYLES.paragraph}">
    THE LOST+UNFOUNDS has been running on its own steam for a while now — the
    galleries, the archives, the writing. Until this week there was no
    straightforward way for anyone to put something toward it, so a few people
    who offered had nowhere to go.
  </p>

  <p style="${EMAIL_STYLES.paragraph}">
    There is now. Pay what you want, from a dollar up.
  </p>

  <p style="${EMAIL_STYLES.paragraph}">
    <a href="${PAY_URL}" style="${EMAIL_STYLES.button}">SUPPORT THE WORK</a>
  </p>

  <p style="${EMAIL_STYLES.paragraph}">
    It goes toward hosting, the print pipeline, and the time that goes into
    shooting and writing. If you would rather not, that is genuinely fine —
    nothing here is going behind a paywall, and everything that was free stays
    free.
  </p>

  <p style="${EMAIL_STYLES.muted}">
    Thanks for reading.<br>
    — Joshua, THE LOST+UNFOUNDS
  </p>
`
}

async function main() {
    const args = process.argv.slice(2)
    const toIndex = args.indexOf('--to')
    const recipient = toIndex !== -1 ? args[toIndex + 1] : 'preview@example.com'
    const shouldSend = args.includes('--send') && args.includes('--confirm')

    const html = generateNewsletterEmail(buildBody(), recipient)

    const outPath = 'newsletter-support-announcement.preview.html'
    writeFileSync(outPath, html, 'utf8')
    console.log(`Subject: ${SUBJECT}`)
    console.log(`Recipient: ${recipient}`)
    console.log(`Rendered preview written to: ${outPath}`)

    if (!shouldSend) {
        console.log('\nDry run only. Re-run with --send --confirm to actually deliver.')
        return
    }

    // Routed through the project's Zoho-primary / Resend-fallback helper rather
    // than either provider directly, per the email-delivery convention.
    const { sendEmail } = await import('../lib/api-handlers/_email-delivery.js' as string)
        .catch(() => ({ sendEmail: null as any }))

    if (!sendEmail) {
        console.error(
            '\nCould not load the email delivery helper. Wire this to the same helper the ' +
            'newsletter handler uses before sending.'
        )
        process.exit(1)
    }

    await sendEmail({ to: recipient, subject: SUBJECT, html })
    console.log(`\nSent to ${recipient}.`)
}

main().catch((err) => {
    console.error(err)
    process.exit(1)
})
