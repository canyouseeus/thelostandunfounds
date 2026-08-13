/**
 * The service account the platform reads photographers' Drive folders as.
 *
 * A photographer never touches Google Cloud Console: the project, the Drive
 * API and this account's key were set up once, platform-side, and the key
 * lives in the server environment. All they do is share their folder with the
 * address below, exactly as they would share it with a person.
 *
 * Lives here because two places have to name it — the onboarding wizard's
 * share step and the invitation email — and a stale copy in either one sends
 * someone to share their folder with an address that does not exist, which
 * fails quietly and looks like the sync is broken.
 */
export const GALLERY_AGENT_EMAIL =
  'the-gallery-agent@the-lost-and-unf-1737406545588.iam.gserviceaccount.com';
