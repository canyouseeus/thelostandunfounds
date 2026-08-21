import type { VercelRequest, VercelResponse } from '@vercel/node';
import { randomBytes } from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseAdmin, resolveCrewMember, resolveIdentity, isAdmin } from './_shared.js';

/**
 * The crew feed — a photographer posts their own work, credited to the kit
 * they shot it on.
 *
 * The gear half is the reason this isn't just an image upload. Everyone on the
 * roster has already typed their bag into /gear, so a load-out is a selection
 * out of a list they own rather than free text typed again per post. What gets
 * written to the post is a *copy* of those rows, not a pointer at them:
 * /api/crew/gear replaces a kit wholesale on every save (delete-then-insert),
 * so a foreign key would strip the credits off a year of posts the first time
 * somebody fixed a typo in their lens list. `gear_id` is kept alongside the
 * copy as a soft pointer, purely so "is this still in the bag?" stays
 * answerable.
 *
 * Uploads go browser -> Supabase Storage on a signed URL, never through this
 * function. A Vercel body caps out around 4.5MB and a single phone photo beats
 * that; api/client-uploads solved the same problem the same way.
 *
 *   GET    /api/crew/feed                     public feed, newest first
 *   GET    /api/crew/feed?mine=1              the caller's own posts, hidden included
 *   GET    /api/crew/feed?photographer=<id>   one photographer's public posts
 *   GET    /api/crew/feed?gear=<model>        everything shot on one piece of kit
 *   GET    /api/crew/feed?kit=1               the caller's kit, for the composer
 *   POST   /api/crew/feed?action=sign         signed upload URLs for a batch
 *   POST   /api/crew/feed                     create a post from an uploaded batch
 *   PATCH  /api/crew/feed?id=<id>             edit caption / location / visibility
 *   DELETE /api/crew/feed?id=<id>             delete a post and its objects
 *
 * Posting requires a real session. The gear form deliberately accepts an invite
 * token so somebody with no account can fill in their bag, but a token that has
 * been forwarded through a mail thread should not be able to publish to the
 * front of the site, so this route resolves the author from a verified JWT only.
 */

export const BUCKET = 'crew-feed';

/** Reels are reels. Eight seconds, enforced in the composer and again here. */
export const MAX_VIDEO_SECONDS = 8;

/**
 * Byte ceilings, which exist for the bill rather than for tidiness.
 *
 * An 8s clip is not automatically a small file — the same eight seconds is
 * ~12MB of 1080p H.264 off a phone and ~250MB of ProRes off the same phone in
 * a different mode. 25MB accepts everything in the first category and rejects
 * the second with a message that says what to do about it, which is better
 * than silently storing a quarter-gigabyte per post.
 */
export const MAX_VIDEO_BYTES = 25 * 1024 * 1024;
export const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
export const MAX_POSTER_BYTES = 2 * 1024 * 1024;
export const MAX_MEDIA_PER_POST = 10;

/** Per-photographer ceiling on stored bytes. Overridable, but never absent. */
export function quotaBytes(): number {
  const mb = Number(process.env.CREW_FEED_QUOTA_MB);
  return (Number.isFinite(mb) && mb > 0 ? mb : 2048) * 1024 * 1024;
}

const IMAGE_MIME = /^image\/(jpeg|jpg|png|webp|gif|heic|heif)$/i;
const VIDEO_MIME = /^video\/(mp4|quicktime|webm)$/i;

const trim = (value: unknown, max: number): string =>
  typeof value === 'string' ? value.trim().slice(0, max) : '';

export interface MediaInput {
  path?: string;
  poster_path?: string;
  name?: string;
  type?: string;
  size?: number;
  width?: number;
  height?: number;
  duration?: number;
}

export interface GearInput {
  gear_id?: string | null;
  category?: string;
  make?: string | null;
  model?: string;
  details?: string | null;
}

/** Storage-safe filename that still reads like the one they picked. */
export function safeName(name: string): string {
  const cleaned = (name || 'file')
    .replace(/[\\/]/g, '-')
    .replace(/[^\w.\-]/g, '_')
    .trim();
  return cleaned.slice(-100) || 'file';
}

export function kindFor(mime: string): 'photo' | 'video' | null {
  if (IMAGE_MIME.test(mime)) return 'photo';
  if (VIDEO_MIME.test(mime)) return 'video';
  return null;
}

/**
 * Read the true duration out of an MP4/MOV container.
 *
 * The composer checks length before uploading, but that check runs on a number
 * the browser handed us — and mobile Safari reports `Infinity` for a clip that
 * is still being written, which would sail past a naive `<= 8` on a file of any
 * length. So the real length is read back off the stored bytes: every MP4 and
 * MOV carries an `mvhd` atom holding a timescale and a duration in that scale.
 *
 * `moov` sits at the end of the file on most phone recordings and at the front
 * on anything that has been through an editor, so both ends get sampled. WebM
 * is a different container and is not parsed here; it falls back to the
 * reported duration plus the byte ceiling, which is why the byte ceiling is not
 * optional.
 */
export function mvhdSeconds(buf: Buffer): number | null {
  const idx = buf.indexOf('mvhd', 0, 'ascii');
  if (idx < 0) return null;
  const version = buf[idx + 4];
  try {
    if (version === 1) {
      if (buf.length < idx + 36) return null;
      const timescale = buf.readUInt32BE(idx + 24);
      const duration = Number(buf.readBigUInt64BE(idx + 28));
      return timescale > 0 ? duration / timescale : null;
    }
    if (buf.length < idx + 24) return null;
    const timescale = buf.readUInt32BE(idx + 16);
    const duration = buf.readUInt32BE(idx + 20);
    return timescale > 0 ? duration / timescale : null;
  } catch {
    return null;
  }
}

/** Pull the head and tail of a stored object, enough to find `moov` at either end. */
async function probeStoredVideo(publicUrl: string): Promise<number | null> {
  const range = async (header: string): Promise<Buffer | null> => {
    try {
      const res = await fetch(publicUrl, { headers: { Range: header } });
      if (!res.ok) return null;
      return Buffer.from(await res.arrayBuffer());
    } catch {
      return null;
    }
  };

  const head = await range('bytes=0-262143');
  if (head) {
    const seconds = mvhdSeconds(head);
    if (seconds !== null) return seconds;
  }
  const tail = await range('bytes=-262144');
  if (tail) return mvhdSeconds(tail);
  return null;
}

function publicUrlFor(supabase: SupabaseClient, path: string): string {
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

/** Bytes this photographer is already using, so a quota can mean something. */
export async function bytesUsed(supabase: SupabaseClient, photographerId: string): Promise<number> {
  const { data: posts } = await supabase
    .from('crew_posts')
    .select('id')
    .eq('photographer_id', photographerId);

  const ids = (posts || []).map((p: any) => p.id);
  if (!ids.length) return 0;

  const { data: media } = await supabase
    .from('crew_post_media')
    .select('size_bytes')
    .in('post_id', ids);

  return (media || []).reduce((sum: number, row: any) => sum + Number(row.size_bytes || 0), 0);
}

/** Shape a submitted load-out row. Null means "an empty line in the form". */
function normalizeGear(raw: GearInput, position: number) {
  const model = trim(raw.model, 120);
  if (!model) return null;
  return {
    gear_id: typeof raw.gear_id === 'string' && raw.gear_id ? raw.gear_id : null,
    category: trim(raw.category, 40).toLowerCase() || 'other',
    make: trim(raw.make, 80) || null,
    model,
    details: trim(raw.details, 500) || null,
    position,
  };
}

/** Attach media and gear to a set of posts in two queries rather than 2N. */
async function hydrate(supabase: SupabaseClient, posts: any[]): Promise<any[]> {
  if (!posts.length) return [];
  const ids = posts.map((p) => p.id);

  const [{ data: media }, { data: gear }, { data: people }] = await Promise.all([
    supabase
      .from('crew_post_media')
      .select('id, post_id, kind, url, poster_url, mime_type, width, height, duration_seconds, position')
      .in('post_id', ids)
      .order('position', { ascending: true }),
    supabase
      .from('crew_post_gear')
      .select('id, post_id, gear_id, category, make, model, details, position')
      .in('post_id', ids)
      .order('position', { ascending: true }),
    supabase
      .from('photographers')
      .select('id, name, instagram')
      .in('id', Array.from(new Set(posts.map((p) => p.photographer_id)))),
  ]);

  const mediaBy = new Map<string, any[]>();
  for (const row of media || []) {
    const list = mediaBy.get(row.post_id) || [];
    list.push(row);
    mediaBy.set(row.post_id, list);
  }
  const gearBy = new Map<string, any[]>();
  for (const row of gear || []) {
    const list = gearBy.get(row.post_id) || [];
    list.push(row);
    gearBy.set(row.post_id, list);
  }
  const personBy = new Map((people || []).map((p: any) => [p.id, p]));

  return posts.map((post) => ({
    ...post,
    photographer: personBy.get(post.photographer_id) || null,
    media: mediaBy.get(post.id) || [],
    gear: gearBy.get(post.id) || [],
  }));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Inside the try on purpose. This throws when the Supabase env vars are
    // absent, and outside the try that surfaces as an opaque
    // FUNCTION_INVOCATION_FAILED with nothing but a stack in the platform log
    // — which is exactly what preview deployments do today, since the service
    // key is only bound to production. A JSON 500 says which of the two it is.
    const supabase = getSupabaseAdmin();

    // ---- Reads -------------------------------------------------------------
    if (req.method === 'GET') {
      const limit = Math.min(50, Math.max(1, Number(req.query?.limit) || 12));
      const before = trim(req.query?.before, 40);

      // The composer's own list: the caller's kit, so a load-out is picked
      // rather than retyped.
      if (req.query?.kit) {
        const resolved = await resolveCrewMember(supabase, req, 'id, name, email');
        if (!resolved) return res.status(401).json({ error: 'Sign in to post to the feed.' });
        const { data: items } = await supabase
          .from('photographer_gear')
          .select('id, category, make, model, details, quantity, is_primary')
          .eq('photographer_id', resolved.photographer.id)
          .order('category', { ascending: true })
          .order('model', { ascending: true });
        return res.status(200).json({
          photographer: { id: resolved.photographer.id, name: resolved.photographer.name },
          items: items || [],
          used_bytes: await bytesUsed(supabase, resolved.photographer.id),
          quota_bytes: quotaBytes(),
          limits: {
            max_video_seconds: MAX_VIDEO_SECONDS,
            max_video_bytes: MAX_VIDEO_BYTES,
            max_image_bytes: MAX_IMAGE_BYTES,
            max_media_per_post: MAX_MEDIA_PER_POST,
          },
        });
      }

      // A photographer managing their own wall sees hidden posts too.
      if (req.query?.mine) {
        const resolved = await resolveCrewMember(supabase, req, 'id, name, email');
        if (!resolved) return res.status(401).json({ error: 'Sign in to see your posts.' });
        let query = supabase
          .from('crew_posts')
          .select('id, photographer_id, caption, location, visibility, status, media_count, created_at')
          .eq('photographer_id', resolved.photographer.id)
          .order('created_at', { ascending: false })
          .limit(limit);
        if (before) query = query.lt('created_at', before);
        const { data, error } = await query;
        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json({ posts: await hydrate(supabase, data || []) });
      }

      // Public feed. A gear filter is a lookup on the snapshot rows, which is
      // the whole reason the load-out is stored as queryable rows.
      let postIds: string[] | null = null;
      const gearFilter = trim(req.query?.gear, 120);
      if (gearFilter) {
        const { data: matches } = await supabase
          .from('crew_post_gear')
          .select('post_id')
          .ilike('model', `%${gearFilter}%`)
          .limit(500);
        postIds = Array.from(new Set((matches || []).map((m: any) => m.post_id)));
        if (!postIds.length) return res.status(200).json({ posts: [] });
      }

      // 'crew' posts are the work-in-progress shelf: visible to people on the
      // roster and to the owner, not on the public wall. Resolving the viewer
      // costs a token verification, so it only happens when a token was
      // actually sent — an anonymous read stays a single round trip.
      const viewerIsCrew = req.headers.authorization
        ? Boolean(await resolveCrewMember(supabase, req, 'id')) || isAdmin(req)
        : isAdmin(req);

      let query = supabase
        .from('crew_posts')
        .select('id, photographer_id, caption, location, visibility, status, media_count, created_at')
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (!viewerIsCrew) query = query.eq('visibility', 'public');

      const photographerFilter = trim(req.query?.photographer, 60);
      if (photographerFilter) query = query.eq('photographer_id', photographerFilter);
      if (postIds) query = query.in('id', postIds);
      if (before) query = query.lt('created_at', before);

      const { data, error } = await query;
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ posts: await hydrate(supabase, data || []) });
    }

    // ---- Everything below writes, so the author must be provable -----------
    const resolved = await resolveCrewMember(supabase, req, 'id, name, email');
    if (!resolved) {
      const identity = await resolveIdentity(req);
      return res.status(identity ? 403 : 401).json({
        error: identity
          ? 'You are not on the roster yet — ask for an invite before posting.'
          : 'Sign in to post to the feed.',
      });
    }
    const photographer = resolved.photographer;

    // ---- Signed upload URLs ------------------------------------------------
    if (req.method === 'POST' && req.query?.action === 'sign') {
      const body = (req.body || {}) as { files?: MediaInput[] };
      const files = Array.isArray(body.files) ? body.files : [];
      if (!files.length) return res.status(400).json({ error: 'No files provided.' });
      if (files.length > MAX_MEDIA_PER_POST) {
        return res.status(400).json({ error: `A post takes up to ${MAX_MEDIA_PER_POST} files.` });
      }

      const incoming = files.reduce((sum, f) => sum + Number(f.size || 0), 0);
      const used = await bytesUsed(supabase, photographer.id);
      if (used + incoming > quotaBytes()) {
        const gb = (quotaBytes() / (1024 * 1024 * 1024)).toFixed(1);
        return res.status(400).json({
          error: `That would put you over your ${gb}GB feed allowance. Delete an older post to make room.`,
        });
      }

      const batch = randomBytes(12).toString('hex');
      const signed = [];

      for (const [index, file] of files.entries()) {
        const mime = trim(file.type, 80).toLowerCase();
        const kind = kindFor(mime);
        if (!kind) return res.status(400).json({ error: 'Only photos and video can be posted.' });

        const size = Number(file.size || 0);
        const ceiling = kind === 'video' ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
        if (size > ceiling) {
          return res.status(400).json({
            error:
              kind === 'video'
                ? `Reels are capped at ${Math.round(MAX_VIDEO_BYTES / 1024 / 1024)}MB. Export at 1080p rather than ProRes/4K and it will fit.`
                : `Photos are capped at ${Math.round(MAX_IMAGE_BYTES / 1024 / 1024)}MB.`,
          });
        }

        const duration = Number(file.duration);
        if (kind === 'video' && Number.isFinite(duration) && duration > MAX_VIDEO_SECONDS + 0.25) {
          return res.status(400).json({ error: `Reels are capped at ${MAX_VIDEO_SECONDS} seconds.` });
        }

        const name = safeName(file.name || `${kind}-${index}`);
        const path = `${photographer.id}/${batch}/${String(index).padStart(2, '0')}-${name}`;
        const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(path);
        if (error) return res.status(500).json({ error: error.message });

        const entry: Record<string, unknown> = { name, kind, path, token: data.token };

        // A reel also gets somewhere to put its first frame. The feed shows
        // that instead of the clip until the clip is on screen.
        if (kind === 'video') {
          const posterPath = `${photographer.id}/${batch}/${String(index).padStart(2, '0')}-poster.jpg`;
          const { data: posterData, error: posterError } = await supabase.storage
            .from(BUCKET)
            .createSignedUploadUrl(posterPath);
          if (posterError) return res.status(500).json({ error: posterError.message });
          entry.poster_path = posterPath;
          entry.poster_token = posterData.token;
        }

        signed.push(entry);
      }

      return res.status(200).json({ batch, bucket: BUCKET, files: signed });
    }

    // ---- Create a post from an uploaded batch ------------------------------
    if (req.method === 'POST') {
      const body = (req.body || {}) as {
        caption?: string;
        location?: string;
        visibility?: string;
        media?: MediaInput[];
        gear?: GearInput[];
      };

      const media = Array.isArray(body.media) ? body.media.filter((m) => m.path) : [];
      if (!media.length) return res.status(400).json({ error: 'A post needs at least one photo or reel.' });
      if (media.length > MAX_MEDIA_PER_POST) {
        return res.status(400).json({ error: `A post takes up to ${MAX_MEDIA_PER_POST} files.` });
      }

      // Only objects under this photographer's own prefix. Signing hands back
      // paths, and a caller could post someone else's back at us otherwise.
      for (const item of media) {
        if (!String(item.path).startsWith(`${photographer.id}/`)) {
          return res.status(400).json({ error: 'Invalid file path.' });
        }
        if (item.poster_path && !String(item.poster_path).startsWith(`${photographer.id}/`)) {
          return res.status(400).json({ error: 'Invalid poster path.' });
        }
      }

      const rows: any[] = [];
      for (const [index, item] of media.entries()) {
        const mime = trim(item.type, 80).toLowerCase();
        const kind = kindFor(mime);
        if (!kind) return res.status(400).json({ error: 'Only photos and video can be posted.' });

        const path = String(item.path);
        const url = publicUrlFor(supabase, path);
        let duration: number | null = null;

        if (kind === 'video') {
          // The length that counts is the one in the file, not the one the
          // browser reported. Anything unreadable (WebM, an odd muxer) falls
          // back to the reported value, which is why the byte cap at signing
          // time is load-bearing rather than belt-and-braces.
          const probed = await probeStoredVideo(url);
          const reported = Number(item.duration);
          const actual = probed ?? (Number.isFinite(reported) ? reported : null);

          if (actual === null || actual > MAX_VIDEO_SECONDS + 0.25) {
            const paths = [path];
            if (item.poster_path) paths.push(String(item.poster_path));
            await supabase.storage.from(BUCKET).remove(paths);
            return res.status(400).json({
              error:
                actual === null
                  ? 'That clip length could not be read. Re-export it as MP4 and try again.'
                  : `Reels are capped at ${MAX_VIDEO_SECONDS} seconds — that one is ${actual.toFixed(1)}s.`,
            });
          }
          duration = Math.round(actual * 100) / 100;
        }

        rows.push({
          kind,
          storage_path: path,
          url,
          poster_path: item.poster_path ? String(item.poster_path) : null,
          poster_url: item.poster_path ? publicUrlFor(supabase, String(item.poster_path)) : null,
          mime_type: mime,
          size_bytes: Number(item.size) > 0 ? Math.floor(Number(item.size)) : null,
          width: Number(item.width) > 0 ? Math.floor(Number(item.width)) : null,
          height: Number(item.height) > 0 ? Math.floor(Number(item.height)) : null,
          duration_seconds: duration,
          position: index,
        });
      }

      const visibility = trim(body.visibility, 20) === 'crew' ? 'crew' : 'public';
      const { data: post, error: postError } = await supabase
        .from('crew_posts')
        .insert({
          photographer_id: photographer.id,
          caption: trim(body.caption, 2000) || null,
          location: trim(body.location, 160) || null,
          visibility,
          status: 'published',
          media_count: rows.length,
        })
        .select('id, photographer_id, caption, location, visibility, status, media_count, created_at')
        .single();
      if (postError) return res.status(500).json({ error: postError.message });

      const { error: mediaError } = await supabase
        .from('crew_post_media')
        .insert(rows.map((row) => ({ ...row, post_id: post.id })));
      if (mediaError) {
        // Leave nothing half-written: a post with no media renders as an empty
        // card that nobody can fix from the UI.
        await supabase.from('crew_posts').delete().eq('id', post.id);
        return res.status(500).json({ error: mediaError.message });
      }

      const gear = (Array.isArray(body.gear) ? body.gear : [])
        .map((item, index) => normalizeGear(item, index))
        .filter((item): item is NonNullable<ReturnType<typeof normalizeGear>> => item !== null)
        .slice(0, 40);

      if (gear.length) {
        const { error: gearError } = await supabase
          .from('crew_post_gear')
          .insert(gear.map((item) => ({ ...item, post_id: post.id })));
        // A load-out that failed to attach is worth logging and not worth
        // throwing the post away over — it can be re-picked by editing.
        if (gearError) console.warn('[crew/feed] gear attach failed:', gearError.message);
      }

      const [hydrated] = await hydrate(supabase, [post]);
      return res.status(200).json({ post: hydrated });
    }

    // ---- Edit ---------------------------------------------------------------
    if (req.method === 'PATCH') {
      const id = trim(req.query?.id ?? (req.body as any)?.id, 60);
      if (!id) return res.status(400).json({ error: 'id is required' });

      const { data: existing } = await supabase
        .from('crew_posts')
        .select('id, photographer_id')
        .eq('id', id)
        .maybeSingle();
      if (!existing) return res.status(404).json({ error: 'Post not found.' });
      if (existing.photographer_id !== photographer.id && !isAdmin(req)) {
        return res.status(403).json({ error: 'That is not your post.' });
      }

      const body = (req.body || {}) as {
        caption?: string;
        location?: string;
        visibility?: string;
        status?: string;
      };
      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (body.caption !== undefined) patch.caption = trim(body.caption, 2000) || null;
      if (body.location !== undefined) patch.location = trim(body.location, 160) || null;
      if (body.visibility !== undefined) patch.visibility = trim(body.visibility, 20) === 'crew' ? 'crew' : 'public';
      if (body.status !== undefined) patch.status = trim(body.status, 20) === 'hidden' ? 'hidden' : 'published';

      const { data: updated, error } = await supabase
        .from('crew_posts')
        .update(patch)
        .eq('id', id)
        .select('id, photographer_id, caption, location, visibility, status, media_count, created_at')
        .single();
      if (error) return res.status(500).json({ error: error.message });

      const [hydrated] = await hydrate(supabase, [updated]);
      return res.status(200).json({ post: hydrated });
    }

    // ---- Delete -------------------------------------------------------------
    if (req.method === 'DELETE') {
      const id = trim(req.query?.id ?? (req.body as any)?.id, 60);
      if (!id) return res.status(400).json({ error: 'id is required' });

      const { data: existing } = await supabase
        .from('crew_posts')
        .select('id, photographer_id')
        .eq('id', id)
        .maybeSingle();
      if (!existing) return res.status(404).json({ error: 'Post not found.' });
      if (existing.photographer_id !== photographer.id && !isAdmin(req)) {
        return res.status(403).json({ error: 'That is not your post.' });
      }

      // Objects go first. A row deleted before its bytes leaves nothing that
      // knows the bytes exist, and the bucket grows for the rest of its life.
      const { data: media } = await supabase
        .from('crew_post_media')
        .select('storage_path, poster_path')
        .eq('post_id', id);

      const paths = (media || [])
        .flatMap((row: any) => [row.storage_path, row.poster_path])
        .filter(Boolean) as string[];
      if (paths.length) {
        const { error: removeError } = await supabase.storage.from(BUCKET).remove(paths);
        if (removeError) console.warn('[crew/feed] storage cleanup failed:', removeError.message);
      }

      const { error } = await supabase.from('crew_posts').delete().eq('id', id);
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ success: true, removed: paths.length });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err: any) {
    console.error('[crew/feed]', err);
    return res.status(500).json({ error: err?.message || 'Server error' });
  }
}
