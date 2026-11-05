import type { SupabaseClient } from '@supabase/supabase-js';
import { sendTransactionalEmail } from '../_resend-email-handler.js';
import { EMAIL_STYLES, renderImageButton } from '../../email-template.js';
import { PHOTOGRAPHER_TERMS_KEY, PHOTOGRAPHER_TERMS_VERSION } from '../_terms.js';

/**
 * One-off announcements to the photographer roster, sent by the
 * `crew_announcement` admin job.
 *
 * Same shape as the setup email (onboarding-email.ts): from Joshua, CC media@
 * as the business record, one email per person built from their real state,
 * and every delivery logged in `crew_email_log` under the campaign key so a
 * second run skips whoever already has it.
 *
 * The copy lives here so it is reviewed in a PR and sent as reviewed. A new
 * announcement is a new entry in CAMPAIGNS with a new key; never reuse a key.
 */

const SITE = 'https://www.thelostandunfounds.com';
const BUSINESS_RECORD_CC = 'media@thelostandunfounds.com';
const FROM_ADDRESS = process.env.CREW_FROM_EMAIL || 'joshua@thelostandunfounds.com';

// The house account is a roster row so invoices can name it. Not a person to mail.
const OWNER_ADDRESSES = new Set([
  'thelostandunfounds@gmail.com',
  'media@thelostandunfounds.com',
  'admin@thelostandunfounds.com',
]);

const P = EMAIL_STYLES.paragraph;
const H1 = EMAIL_STYLES.heading1;
const H2 = EMAIL_STYLES.heading2;
const LINK = EMAIL_STYLES.link;
const MUTED = EMAIL_STYLES.muted;
const TERMS_URL = `${SITE}/terms/photographers`;
// The Photographer app on /dashboard; /photographer-dashboard only redirects here.
const DASHBOARD_URL = `${SITE}/dashboard?section=photographer`;

export interface CrewMember {
  id: string;
  name: string;
  email: string;
  hasLogin: boolean;
  agreedToTerms: boolean;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const firstName = (person: CrewMember) =>
  escapeHtml(person.name.trim().split(/\s+/)[0] || 'there');

const signOff = `
  <p style="${P}">Joshua / <strong>THE LOST+UNFOUNDS</strong></p>
  <hr style="${EMAIL_STYLES.divider}" />
  <p style="${MUTED}">
    This comes straight from me, so reply and it lands in my inbox. Anything broken can also go
    through GET HELP on your dashboard.
  </p>`;

const section = (title: string, body: string) => `<h2 style="${H2}">${title}</h2>${body}`;

/** Separate email: the Photographer Terms, what they say, and that uploads wait on them. */
function termsEmail(person: CrewMember) {
  const name = firstName(person);
  const action = person.agreedToTerms
    ? `<p style="${P}">
         You've already agreed to the current version, so <strong>there is nothing you need to do</strong>.
         This is your copy of what changed, for the record.
       </p>`
    : `<p style="${P}">
         <strong>Uploads are paused until you agree.</strong> That covers your galleries, live
         galleries and upload links. The next time you open your dashboard to upload, it shows you
         the terms and a box to tick. It takes a minute, and you only do it once per version.
       </p>
       ${person.hasLogin ? '' : `<p style="${P}">You'll need to sign in first. <strong>Use this exact email address</strong>, so the account connects to your spot on the roster.</p>`}`;

  const content = `
    <h1 style="${H1}">UPDATED PHOTOGRAPHER TERMS</h1>
    <p style="${P}">
      Hey ${name}, we now have written <strong>PHOTOGRAPHER TERMS</strong>. Everything you shoot,
      upload or sell through us now runs under them. Please read the whole thing. The short version
      is below, but the terms page is what counts.
    </p>
    ${action}
    ${section('YOUR WORK', `<p style="${P}">
      You keep the copyright to your photos. You give us a license to host them, sell them, deliver
      them to clients and use them to promote the business. We can edit, hide or remove anything on
      the platform at any time. It is not a backup, so <strong>keep your own originals</strong>, and
      keep job files for at least 90 days after delivery.
    </p>`)}
    ${section('WHAT CAN NEVER GO UP', `<p style="${P}">
      Zero tolerance for anything sexual involving anyone under 18, sexually explicit content,
      images taken without consent or in private places (restrooms, changing rooms, hidden cameras),
      abuse, harassment, deepfakes, or anything illegal. It comes down immediately, the account is
      closed, and anything involving a minor is reported to NCMEC and law enforcement, as federal
      law requires.
    </p>`)}
    ${section('NUDITY', `<p style="${P}">
      Artistic, editorial or event nudity of adults is allowed, but only if you checked a
      government ID, have <strong>signed written consent</strong> to photograph and publish, and
      tick <strong>"These photos contain nudity"</strong> when you upload. Those photos are blurred
      on public pages until the viewer confirms they're 18+. Keep the ID check and consent for
      7 years. We'll ask for them if anything is ever questioned.
    </p>
    <p style="${P}">
      <strong>Candid photos are fine.</strong> Shooting people at events and in public without
      asking each one first is normal event photography and is allowed.
    </p>`)}
    ${section('PAY', `<p style="${P}">
      <strong>Shoots we book:</strong> you keep <strong>80%</strong>, the same as always, released
      as the client pays.<br />
      <strong>Sales from your own galleries:</strong> you keep <strong>97%</strong>, less your share
      of Stripe's processing fee. The house keeps 3%. This replaces the "100%" in the setup email
      you got in August.
    </p>
    <p style="${P}">
      Payouts go through Stripe once the payment settles. Refunds and chargebacks come back out of
      future payouts.
    </p>`)}
    ${section('WORKING TOGETHER', `<p style="${P}">
      You're an independent contractor. Clients who come to you through us stay ours for 12 months
      after your last job with them. If one reaches out to you directly, send them our way and we'll
      book it through <strong>DIRECT BOOKING</strong> so you still get your share. You can show your
      work from our jobs in your own portfolio.
    </p>`)}
    ${renderImageButton(TERMS_URL, 'btn-photographer-terms', 'READ THE TERMS')}
    <p style="${MUTED}">
      The full terms: <a href="${TERMS_URL}" style="${LINK}">thelostandunfounds.com/terms/photographers</a>.
      Questions go to media@thelostandunfounds.com.
    </p>
    ${signOff}`;

  return {
    subject: `${name}, updated Photographer Terms (please read)`,
    content,
    variant: person.agreedToTerms ? 'already-agreed' : person.hasLogin ? 'needs-agreement' : 'needs-login',
  };
}

/** The new photographer tools since September. */
function toolsEmail(person: CrewMember) {
  const name = firstName(person);
  const loginNote = person.hasLogin
    ? ''
    : `<p style="${P}">
         First, you'll need to sign in. <strong>Use this exact email address</strong>, so the account
         connects to your spot on the roster. Everything below lives behind that login.
       </p>`;

  const content = `
    <h1 style="${H1}">NEW ON YOUR DASHBOARD</h1>
    <p style="${P}">
      Hey ${name}, a lot has landed for photographers over the last few weeks. Here's what's there
      now and what it's for.
    </p>
    ${loginNote}
    ${section('ONE DASHBOARD', `<p style="${P}">
      Everything is on <strong>thelostandunfounds.com/dashboard</strong> now. Tap the camera icon,
      <strong>PHOTOGRAPHER</strong>, for your jobs, pay, calendar and live galleries. The old
      photographer dashboard link still works and takes you there.
    </p>`)}
    ${section('LIVE GALLERIES', `<p style="${P}">
      Run a gallery during the event, not after. Name the event and tap
      <strong>NEW LIVE GALLERY</strong>, or pick one you already made. Tap <strong>GO LIVE</strong>,
      then <strong>SEND FROM CAMERA ROLL</strong> and choose the keepers, photos or video. They show
      up for guests right away, each one named and credited to you. <strong>END LIVE</strong> when
      the night is over.
    </p>`)}
    ${section('YOUR CALENDAR', `<p style="${P}">
      Block a few hours, not just a whole day: say 1:00 to 3:00 PM. Even better, connect your Google,
      iCloud or Outlook calendar and your busy times block themselves, every hour. We only see that
      you're busy, never what the event is.
    </p>`)}
    ${section('YOUR GALLERIES', `<p style="${P}">
      Galleries take video now, up to 2GB a clip. Uploads pick back up if you switch apps halfway.
      Tap any photo to make it the cover or delete it. Each gallery has two lists:
      <strong>ALBUM OWNERS</strong> get every photo free, and <strong>À LA CARTE</strong> buyers
      pay per photo, with bundles, a whole-album price, or a set number of free photos you choose.
    </p>`)}
    ${section('PORTFOLIO', `<p style="${P}">
      You get your own public page at thelostandunfounds.com/portfolio/your-handle: photos, video,
      YouTube and TikTok, and a WORKED WITH wall of logos. Edit it from the
      <strong>PORTFOLIO</strong> app, and add a profile picture while you're there.
    </p>`)}
    ${section('CONTENT REQUESTS', `<p style="${P}">
      Need a client's logo or footage? <strong>CONTENT REQUESTS</strong> makes them an upload link,
      no login needed. Their files go to your own Drive folder and you're told when they land.
      <strong>MAKE WHITE</strong> turns a dark logo white so it shows on our black pages.
    </p>`)}
    ${section('BRAND KIT', `<p style="${P}">
      The tiger mascot in white and black, how to use it, and a private folder for your own logos.
    </p>`)}
    ${section('QR CODES, WALLPAPERS AND SCREENS', `<p style="${P}">
      Every gallery has a QR button: put the code on one of your photos and download it as a phone
      wallpaper or a print for the table. <strong>SCREENS</strong> turns any of your photos into a
      halftone film for screen printing, ready to download, share or email as a PDF.
    </p>`)}
    ${section('18+ PHOTOS', `<p style="${P}">
      If a set contains nudity, tick <strong>"These photos contain nudity"</strong> when you upload.
      They're blurred on public pages until a viewer confirms they're 18+.
    </p>
    <p style="${P}">
      Uploads also need you to agree to the <strong>PHOTOGRAPHER TERMS</strong> first. The dashboard
      asks once, the first time you go to upload, and the separate email explains what's in them.
    </p>`)}
    ${section('HELP AND WALKTHROUGHS', `<p style="${P}">
      <strong>GET HELP</strong> opens a ticket, and we reply by email. Not sure where something is?
      Tap the <strong>?</strong> in the bottom left. Every one of these tools has a walkthrough that
      points at each button in turn.
    </p>`)}
    ${renderImageButton(DASHBOARD_URL, 'btn-crew-dashboard', 'OPEN MY DASHBOARD')}
    ${signOff}`;

  return {
    subject: `${name}, new tools on your dashboard`,
    content,
    variant: person.hasLogin ? 'signed-in' : 'needs-login',
  };
}

export const CAMPAIGNS: Record<string, (person: CrewMember) => { subject: string; content: string; variant: string }> = {
  terms_2026_10_29: termsEmail,
  tools_2026_11: toolsEmail,
};

/** Everyone on the active roster, minus the house, with what each email depends on. */
export async function loadCrew(supabase: SupabaseClient): Promise<CrewMember[]> {
  const { data: people, error } = await supabase
    .from('photographers')
    .select('id, name, email, user_id')
    .eq('active', true)
    .order('name', { ascending: true });
  if (error) throw error;
  const roster = (people || []).filter((p) => !OWNER_ADDRESSES.has(String(p.email).toLowerCase()));

  const userIds = roster.map((p) => p.user_id).filter(Boolean) as string[];
  const { data: accepted, error: termsError } = userIds.length
    ? await supabase
        .from('terms_acceptances')
        .select('user_id')
        .eq('terms_key', PHOTOGRAPHER_TERMS_KEY)
        .eq('version', PHOTOGRAPHER_TERMS_VERSION)
        .in('user_id', userIds)
    : { data: [], error: null };
  if (termsError) throw termsError;
  const agreed = new Set((accepted || []).map((row: any) => row.user_id));

  return roster.map((p) => ({
    id: p.id,
    name: p.name,
    email: p.email,
    hasLogin: Boolean(p.user_id),
    agreedToTerms: Boolean(p.user_id && agreed.has(p.user_id)),
  }));
}

export interface AnnouncementOptions {
  campaign: string;
  /** Send one copy of each variant to this owner address, prefixed [TEST], and stop. */
  testEmail?: string;
  /** Who would be mailed, and nothing sent. */
  dryRun?: boolean;
  /** Required for the real send. */
  confirm?: boolean;
  /** Restrict to these roster addresses. */
  emails?: string[];
}

export async function sendCrewAnnouncement(supabase: SupabaseClient, opts: AnnouncementOptions) {
  const build = CAMPAIGNS[opts.campaign];
  if (!build) {
    throw new Error(`Unknown campaign "${opts.campaign}". Known: ${Object.keys(CAMPAIGNS).join(', ')}`);
  }
  const crew = await loadCrew(supabase);

  if (opts.testEmail) {
    // Test copies go to the owner only: this must never become a way to mail
    // arbitrary addresses from Joshua's name.
    if (!OWNER_ADDRESSES.has(opts.testEmail.toLowerCase())) {
      throw new Error('testEmail must be an owner address');
    }
    const seen = new Set<string>();
    const sent = [];
    for (const person of crew) {
      const email = build(person);
      if (seen.has(email.variant)) continue;
      seen.add(email.variant);
      const result = await sendTransactionalEmail({
        to: opts.testEmail,
        from: FROM_ADDRESS,
        subject: `[TEST: ${person.name}] ${email.subject}`,
        content: email.content,
      });
      sent.push({ renderedFor: person.name, variant: email.variant, ...result });
      await new Promise((resolve) => setTimeout(resolve, 750));
    }
    return { mode: 'test', campaign: opts.campaign, sentTo: opts.testEmail, variants: sent };
  }

  const only = opts.emails?.length ? new Set(opts.emails.map((e) => e.toLowerCase().trim())) : null;
  const selected = only ? crew.filter((p) => only.has(p.email.toLowerCase())) : crew;

  const { data: logged, error: logReadError } = await supabase
    .from('crew_email_log')
    .select('photographer_id')
    .eq('campaign', opts.campaign);
  if (logReadError) throw logReadError;
  const done = new Set((logged || []).map((row: any) => row.photographer_id));
  const targets = selected.filter((p) => !done.has(p.id));
  const alreadySent = selected.filter((p) => done.has(p.id)).map((p) => p.email);

  if (opts.dryRun || opts.confirm !== true) {
    return {
      mode: 'dryRun',
      campaign: opts.campaign,
      note: opts.dryRun ? undefined : 'Nothing sent: pass confirm: true to send.',
      alreadySent,
      wouldSend: targets.map((p) => ({ name: p.name, email: p.email, variant: build(p).variant })),
    };
  }

  const results = [];
  for (const person of targets) {
    const email = build(person);
    const result = await sendTransactionalEmail({
      to: person.email,
      cc: BUSINESS_RECORD_CC,
      from: FROM_ADDRESS,
      subject: email.subject,
      content: email.content,
    });
    results.push({ email: person.email, variant: email.variant, ...result });
    // Logged per send, not after the loop, so a timeout mid-run can't lead to
    // a second run mailing people twice.
    if (result.success) {
      const { error: logError } = await supabase.from('crew_email_log').insert({
        photographer_id: person.id,
        campaign: opts.campaign,
        email: person.email,
        provider: result.provider || null,
      });
      if (logError && (logError as any).code !== '23505') {
        console.warn('[crew/announcements] could not log send:', logError.message);
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 750));
  }
  return {
    mode: 'sent',
    campaign: opts.campaign,
    alreadySent,
    sent: results.filter((r) => r.success).length,
    failed: results.filter((r) => !r.success).length,
    results,
  };
}
