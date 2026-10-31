/**
 * Profile pictures — every signed-in user can set one.
 *
 * Stored in the public `avatars` bucket under `<user id>/...`, and its URL in
 * user_metadata.custom_avatar_url. Not avatar_url: Supabase rewrites
 * avatar_url from Google on every Google sign-in, which would silently throw
 * away a picture the person chose. Read avatars through avatarUrlFor().
 *
 * Who can SET one: photographers, affiliates and the admin (owner rule,
 * 2026-10-31). The avatars bucket refuses anyone else's upload; the UI asks
 * canSetProfilePicture() only to decide whether to show the control.
 */

import { useEffect, useState } from 'react';
import { supabase } from './supabase';

/** Any user shape with an id and metadata (AuthContext's User or Supabase's). */
export interface AvatarUser {
  id: string;
  user_metadata?: Record<string, any> | null;
}

export const AVATAR_BUCKET = 'avatars';
export const AVATAR_MAX_MB = 5;
export const AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

/** The picture to show for a user: theirs, else their Google photo, else none. */
export function avatarUrlFor(user: AvatarUser | null | undefined): string | null {
  const m = user?.user_metadata || {};
  return m.custom_avatar_url || m.avatar_url || m.picture || null;
}

function pathFromUrl(url: string | undefined | null): string | null {
  if (!url) return null;
  const marker = `/object/public/${AVATAR_BUCKET}/`;
  const i = url.indexOf(marker);
  return i === -1 ? null : decodeURIComponent(url.slice(i + marker.length).split('?')[0]);
}

export async function setProfilePicture(user: AvatarUser, file: File): Promise<string> {
  if (!AVATAR_TYPES.includes(file.type)) throw new Error('Use a JPG, PNG, WebP or GIF.');
  if (file.size > AVATAR_MAX_MB * 1024 * 1024) throw new Error(`Pictures must be under ${AVATAR_MAX_MB}MB.`);

  const ext = file.type.split('/')[1].replace('jpeg', 'jpg');
  const path = `${user.id}/${Date.now()}.${ext}`;
  const { error: upErr } = await supabase.storage.from(AVATAR_BUCKET).upload(path, file, {
    contentType: file.type,
    cacheControl: '31536000',
    upsert: false,
  });
  if (upErr) throw new Error(upErr.message);

  const url = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path).data.publicUrl;
  const previous = pathFromUrl(user.user_metadata?.custom_avatar_url);
  const { error } = await supabase.auth.updateUser({ data: { custom_avatar_url: url } });
  if (error) {
    await supabase.storage.from(AVATAR_BUCKET).remove([path]).catch(() => undefined);
    throw new Error(error.message);
  }
  if (previous && previous !== path) {
    await supabase.storage.from(AVATAR_BUCKET).remove([previous]).catch(() => undefined);
  }
  return url;
}

/** Back to the Google photo (or the initial, if there is none). */
export async function clearProfilePicture(user: AvatarUser): Promise<void> {
  const previous = pathFromUrl(user.user_metadata?.custom_avatar_url);
  const { error } = await supabase.auth.updateUser({ data: { custom_avatar_url: null } });
  if (error) throw new Error(error.message);
  if (previous) await supabase.storage.from(AVATAR_BUCKET).remove([previous]).catch(() => undefined);
}

/** Whether the signed-in user may set a picture (photographer, affiliate or admin). */
export async function canSetProfilePicture(): Promise<boolean> {
  const { data, error } = await supabase.rpc('can_set_profile_picture');
  return !error && data === true;
}

export function useCanSetProfilePicture(userId: string | undefined): boolean {
  const [allowed, setAllowed] = useState(false);
  useEffect(() => {
    if (!userId) { setAllowed(false); return; }
    let cancelled = false;
    canSetProfilePicture().then(ok => { if (!cancelled) setAllowed(ok); });
    return () => { cancelled = true; };
  }, [userId]);
  return allowed;
}
