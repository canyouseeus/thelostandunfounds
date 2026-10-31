/**
 * A round profile picture. Photographers, affiliates, writers and the admin get a
 * camera button to change it; everyone else sees the picture only. See
 * src/lib/avatar.ts for where it is stored and who may set one.
 */

import { useRef, useState } from 'react';
import { CameraIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './Toast';
import { cn } from './ui/utils';
import { AVATAR_TYPES, avatarUrlFor, clearProfilePicture, setProfilePicture, useCanSetProfilePicture } from '../lib/avatar';

export default function ProfilePictureEditor({ size = 'md', showActions = false, className }: {
  size?: 'sm' | 'md' | 'lg';
  /** Show CHANGE / REMOVE buttons beside it (settings pages). */
  showActions?: boolean;
  className?: string;
}) {
  const { user, refreshAuth } = useAuth();
  const { success, error: showError } = useToast();
  const [busy, setBusy] = useState(false);
  const [localUrl, setLocalUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const canEdit = useCanSetProfilePicture(user?.id);
  if (!user) return null;

  const hasCustom = !!user.user_metadata?.custom_avatar_url && localUrl !== '';
  const url = localUrl === '' ? (user.user_metadata?.avatar_url || user.user_metadata?.picture || null) : (localUrl || avatarUrlFor(user));
  const dims = size === 'lg' ? 'w-24 h-24 text-4xl' : size === 'sm' ? 'w-10 h-10 text-base' : 'w-12 h-12 sm:w-16 sm:h-16 text-2xl';

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      const next = await setProfilePicture(user, file);
      setLocalUrl(next);
      await refreshAuth();
      success('Profile picture updated.');
    } catch (e: any) {
      showError(e?.message || 'Could not update your picture.');
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await clearProfilePicture(user);
      setLocalUrl('');
      await refreshAuth();
      success('Profile picture removed.');
    } catch (e: any) {
      showError(e?.message || 'Could not remove your picture.');
    } finally {
      setBusy(false);
    }
  };

  if (!canEdit) {
    return (
      <div className={cn('flex items-center gap-4', className)}>
        <div className={cn('shrink-0 rounded-full overflow-hidden bg-white text-black font-black flex items-center justify-center', dims)}>
          {url ? <img src={url} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : <span>{(user.email || '?').charAt(0).toUpperCase()}</span>}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-4', className)}>
      <button
        type="button"
        data-tour="profile-picture"
        onClick={() => fileRef.current?.click()}
        disabled={busy}
        className={cn('relative shrink-0 rounded-full overflow-hidden group bg-white text-black font-black flex items-center justify-center', dims)}
        title="Change profile picture"
        aria-label="Change profile picture"
      >
        {url ? (
          <img src={url} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          <span>{(user.email || '?').charAt(0).toUpperCase()}</span>
        )}
        <span className={cn('absolute inset-0 bg-black/60 flex items-center justify-center text-white transition-opacity', busy ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100')}>
          {busy ? <span className="text-[9px] font-black uppercase tracking-widest">…</span> : <CameraIcon className="w-5 h-5" />}
        </span>
      </button>
      <input ref={fileRef} type="file" accept={AVATAR_TYPES.join(',')} className="hidden" onChange={e => pick(e.target.files?.[0])} />
      {showActions && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest bg-white/10 text-white hover:bg-white hover:text-black transition-colors disabled:opacity-40"
            style={{ borderRadius: 0 }}
          >
            {url ? 'Change' : 'Add picture'}
          </button>
          {hasCustom && (
            <button
              type="button"
              onClick={remove}
              disabled={busy}
              className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest bg-white/5 text-white/60 hover:bg-white hover:text-black transition-colors disabled:opacity-40"
              style={{ borderRadius: 0 }}
            >
              Remove
            </button>
          )}
        </div>
      )}
    </div>
  );
}
