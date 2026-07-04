/**
 * Fire-and-forget signup attempt logging. Never throws, never blocks —
 * a logging failure must not affect the actual auth flow.
 */

export type SignupStage =
  | 'email_signup'
  | 'email_autosignin'
  | 'google_oauth_start'
  | 'google_oauth_callback'
  | 'affiliate_setup';

interface SignupEvent {
  stage: SignupStage;
  success: boolean;
  method?: 'email' | 'google';
  email?: string;
  intent?: string;
  error_message?: string;
}

export function logSignupEvent(event: SignupEvent): void {
  try {
    fetch('/api/auth/log-signup-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...event,
        path: typeof window !== 'undefined' ? window.location.pathname : undefined,
      }),
    }).catch(() => {
      // Non-fatal — telemetry should never surface to the user.
    });
  } catch {
    // Non-fatal
  }
}
