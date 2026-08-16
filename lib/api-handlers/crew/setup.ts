import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAdmin, resolveCrewMember, resolveConnectAccount } from './_shared.js';

/**
 * What a signed-in photographer still has to do.
 *
 * The email that brings them here carries exactly one button, so it can't be
 * the thing that explains the setup: by the time somebody reads a list of
 * tasks in an inbox, the tasks are in the wrong place. This endpoint is how the
 * dashboard picks the explanation back up at the point where they can actually
 * act on it.
 *
 * Server-computed on purpose. The client could count gear rows itself, but
 * "has this person connected Stripe" is a question about an account on another
 * platform reached through two possible records, and the answer has to match
 * the one the payout code uses or the modal will cheerfully tell someone
 * they're finished while their pay has nowhere to go.
 *
 *   GET /api/crew/setup → { photographer, steps[], complete, remaining }
 *
 * Steps come back in the order they should be done, each already carrying its
 * own label and destination, so the modal renders whatever it is handed rather
 * than keeping its own copy of what onboarding means.
 */

export interface SetupStep {
  key: 'gear' | 'stripe' | 'calendar';
  title: string;
  /** Why it matters, in terms of what it costs them to skip. */
  body: string;
  /** What the button says when this step is the one in front of them. */
  action: string;
  /** Where the button goes. Relative, resolved by the client. */
  href: string;
  done: boolean;
  /**
   * Whether leaving this undone keeps the walkthrough coming back.
   *
   * Only gear and Stripe qualify. Blocking out dates is shown in the same flow
   * because it is the new thing and people should see it, but it is not a task
   * that can be finished: somebody with a genuinely open diary has nothing to
   * block, and gating on it would nag them forever for being available.
   */
  required: boolean;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const supabase = getSupabaseAdmin();

  try {
    const resolved = await resolveCrewMember(
      supabase,
      req,
      'id, name, email, user_id, stripe_account_id'
    );
    // Not on the roster is not an error here. Plenty of signed-in accounts sell
    // gallery photos without ever working a booking, and the dashboard should
    // not throw a setup modal at them for a roster they aren't on.
    if (!resolved) {
      return res.status(200).json({ onRoster: false, complete: true, steps: [], remaining: 0 });
    }

    const photographer = resolved.photographer;

    const [{ count: gearItems }, { count: blockedDays }, connect] = await Promise.all([
      supabase
        .from('photographer_gear')
        .select('id', { count: 'exact', head: true })
        .eq('photographer_id', photographer.id),
      supabase
        .from('photographer_availability')
        .select('id', { count: 'exact', head: true })
        .eq('photographer_id', photographer.id),
      // The same resolution the payout code uses, so this can't disagree with
      // whether we can actually pay them.
      resolveConnectAccount(supabase, {
        id: photographer.id,
        user_id: photographer.user_id,
        stripe_account_id: photographer.stripe_account_id,
        email: photographer.email,
      }),
    ]);

    const steps: SetupStep[] = [
      {
        key: 'gear',
        title: 'List your gear',
        body:
          "We search the kit list to work out who to send on a job. A rooftop goes to whoever has the drone, a talking-head to whoever has the lav. With nothing on file you don't come up in that search at all.",
        action: 'Add my gear',
        href: '/gear',
        done: (gearItems || 0) > 0,
        required: true,
      },
      {
        key: 'stripe',
        title: 'Connect Stripe',
        body:
          "This is the one that costs you money if you leave it. We can book you and you can shoot the job, but the pay sits there marked owed with nowhere to send it. Same account covers job pay and your gallery sales, and you only do it once.",
        action: 'Connect Stripe',
        href: '#stripe',
        done: Boolean(connect.accountId),
        required: true,
      },
      {
        key: 'calendar',
        title: 'Block out your dates',
        body:
          "Tap any day you can't shoot and it feeds the studio's master calendar, so we can see who's free before we start calling. It only blocks you, never the date itself.",
        action: 'Open my calendar',
        href: '#calendar',
        done: (blockedDays || 0) > 0,
        required: false,
      },
    ];

    // Only required steps hold the walkthrough open.
    const remaining = steps.filter((step) => step.required && !step.done).length;

    return res.status(200).json({
      onRoster: true,
      photographer: { id: photographer.id, name: photographer.name },
      steps,
      remaining,
      complete: remaining === 0,
    });
  } catch (err: any) {
    console.error('[crew/setup]', err);
    return res.status(500).json({ error: err?.message || 'Server error' });
  }
}
