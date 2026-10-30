import type { SupabaseClient } from '@supabase/supabase-js'
import * as crypto from 'crypto'
import { sendTransactionalEmail } from '../_resend-email-handler.js'
import { GALLERY_AGENT_EMAIL } from '../../../src/lib/gallery-agent.js'

/**
 * The "you're on the roster" photographer invite. One implementation, called by
 * the admin panel's route (api/admin/invite-photographer.ts) and by the
 * `invite_photographer` admin job, so an agent can send it without an admin
 * route of its own.
 *
 * The route used to have no admin check at all: anyone who found the URL could
 * make the platform mail any address from media@. Callers are responsible for
 * the gate; this function assumes it has already been passed.
 */

const SITE = 'https://www.thelostandunfounds.com'
const MEDIA = 'media@thelostandunfounds.com'

export interface PhotographerInviteInput {
  email: string
  name?: string
  /**
   * Preview the email at this address instead: no invitation row is stored,
   * no CC, and the links carry a dead preview token.
   */
  testEmail?: string
}

export interface PhotographerInviteResult {
  sent: boolean
  test: boolean
  to: string
  inviteUrl: string
  provider?: string
  error?: string
}

function inviteContent(name: string | undefined, inviteUrl: string, gearUrl: string): string {
  // Gear leads, gallery follows. The kit list is the thing we actually
  // need back, it takes two minutes and it depends on nothing — whereas
  // gallery setup involves another service and is genuinely optional.
  // Leading with the optional half is what made this read like a chore.
  const button = (href: string, label: string) =>
    `<a href="${href}" style="background: #ffffff; color: #000000; padding: 14px 28px; text-decoration: none; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; display: inline-block;">${label}</a>`
  const fallbackLink = (href: string) =>
    `<p style="color: #aaaaaa; font-size: 12px;">Or copy this link: <a href="${href}" style="color: #aaaaaa; text-decoration: underline;">${href}</a></p>`

  return `
            <h1 style="color: #ffffff; margin-bottom: 20px;">You're on the roster</h1>
            <p style="color: #ffffff;">Hey ${name || 'there'},</p>
            <p style="color: #ffffff;">You're in. Two things and you're set.</p>

            <h2 style="color: #ffffff; margin-top: 36px; margin-bottom: 8px; font-size: 18px;">1. Your equipment</h2>
            <p style="color: #ffffff; margin-top: 0;">What you shoot on — bodies, lenses, lighting, audio, tripods, gimbals. Takes about two minutes, and it's how we know which jobs to send your way. Start here.</p>
            <p style="margin: 20px 0;">${button(gearUrl, 'List My Equipment')}</p>
            ${fallbackLink(gearUrl)}

            <h2 style="color: #ffffff; margin-top: 36px; margin-bottom: 8px; font-size: 18px;">2. Your gallery <span style="color: #aaaaaa; font-weight: normal; font-size: 14px;">(optional)</span></h2>
            <p style="color: #ffffff; margin-top: 0;">Host and sell your work on the site. We sync from one Google Drive folder you pick:</p>
            <ul style="color: #ffffff; padding-left: 20px; line-height: 1.7;">
                <li>In Google Drive, right-click your photo folder &rarr; <strong>Share</strong></li>
                <li>Paste in <span style="color: #aaaaaa; word-break: break-all;">${GALLERY_AGENT_EMAIL}</span></li>
                <li>Set it to <strong>Viewer</strong> &rarr; Send</li>
                <li>Copy the folder link, paste it into the setup page</li>
            </ul>
            <p style="color: #ffffff;">Nothing to install and nothing to set up on Google's end — it's the same as sharing a folder with a person.</p>
            <p style="margin: 20px 0;">${button(inviteUrl, 'Set Up Gallery')}</p>
            ${fallbackLink(inviteUrl)}

            <p style="color: #ffffff; margin-top: 36px;">&mdash; Joshua, THE LOST+UNFOUNDS</p>
        `
}

export async function sendPhotographerInvite(
  supabase: SupabaseClient,
  input: PhotographerInviteInput
): Promise<PhotographerInviteResult> {
  const email = (input.email || '').trim().toLowerCase()
  if (!email || !email.includes('@')) throw Object.assign(new Error('Email is required'), { status: 400 })
  const test = Boolean(input.testEmail)

  let token = 'test-preview'
  if (!test) {
    token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7 day expiry

    const { error: dbError } = await supabase.from('gallery_invitations').insert({
      email,
      token,
      status: 'pending',
      created_at: new Date().toISOString(),
      expires_at: expiresAt.toISOString(),
    })
    if (dbError) throw new Error(`Failed to store invitation: ${dbError.message}`)
  }

  const inviteUrl = `${SITE}/setup?token=${token}`
  // Same token, second destination: the kit list. It is answerable in one
  // sitting with no account, which is why it ships in the first email
  // rather than waiting until after gallery setup.
  const gearUrl = `${SITE}/gear?token=${token}`
  const to = test ? input.testEmail!.trim() : email

  const result = await sendTransactionalEmail({
    to,
    // Photographer coordination is business correspondence, so it
    // comes from the business address of record rather than the admin
    // account, and a reply lands there too. CC keeps the thread on
    // file even when someone replies to one person only. A test preview
    // goes to the tester alone.
    from: MEDIA,
    cc: test ? undefined : MEDIA,
    subject: test ? "[TEST] You're on the roster — two quick things" : "You're on the roster — two quick things",
    content: inviteContent(input.name, inviteUrl, gearUrl),
  })

  return { sent: result.success, test, to, inviteUrl, provider: result.provider, error: result.error }
}
