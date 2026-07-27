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

    // Mirrors sendResendEmail() in _newsletter-send-handler.ts. Inlined rather
    // than imported because that helper is module-private to the handler.
    const apiKey = process.env.RESEND_API_KEY
    const fromEmail =
        process.env.RESEND_FROM_EMAIL ||
        'THE LOST+UNFOUNDS <noreply@thelostandunfounds.com>'

    if (!apiKey) {
        console.error(
            '\nRESEND_API_KEY is not set, so there is no way to deliver this.\n' +
            'Set it in the environment (it already exists in the Vercel project) and re-run,\n' +
            'or send via the admin newsletter tooling instead.'
        )
        process.exit(1)
    }

    const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            from: fromEmail,
            to: recipient,
            subject: SUBJECT,
            html,
        }),
    })

    if (!response.ok) {
        const detail = await response.text().catch(() => '')
        console.error(`\nSend failed (HTTP ${response.status}): ${detail}`)
        process.exit(1)
    }

    const result = await response.json().catch(() => ({}))
    console.log(`\nSent to ${recipient}. Resend id: ${result?.id ?? 'unknown'}`)
}

main().catch((err) => {
    console.error(err)
    process.exit(1)
})
