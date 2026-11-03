/**
 * Send files through a client-upload link (the token is the whole credential).
 *
 * The three steps the server expects: sign (one signed Storage URL per file),
 * upload each file straight to Storage, then record the batch so the server
 * mirrors it to Drive and emails the studio. Used by /upload/:token and by the
 * booking page, which sends brand assets through the link a booking creates.
 */

import { supabase } from './supabase';

export interface UploadResult {
  file: File;
  ok: boolean;
  error?: string;
  path?: string;
}

export async function sendFilesToUploadLink(
  token: string,
  files: File[],
  opts: { note?: string; onFile?: (r: UploadResult) => void; onStart?: () => void } = {},
): Promise<{ received: number; results: UploadResult[] }> {
  if (!files.length) return { received: 0, results: [] };

  const signRes = await fetch('/api/client-uploads/sign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, files: files.map(f => ({ name: f.name, size: f.size, type: f.type })) }),
  });
  const signed = await signRes.json().catch(() => ({}));
  if (!signRes.ok) throw new Error(signed?.error || 'Upload could not be started.');
  opts.onStart?.();

  const results: UploadResult[] = [];
  const uploaded: Array<{ path: string; name: string; size: number; type: string }> = [];
  for (const [index, file] of files.entries()) {
    const target = signed.files[index];
    const { error } = await supabase.storage.from(signed.bucket).uploadToSignedUrl(target.path, target.token, file);
    const r: UploadResult = { file, ok: !error, error: error?.message, path: target.path };
    results.push(r);
    opts.onFile?.(r);
    if (!error) uploaded.push({ path: target.path, name: target.name, size: file.size, type: file.type });
  }
  if (!uploaded.length) throw new Error('None of the files finished uploading. Please try again.');

  const recordRes = await fetch('/api/client-uploads/record', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, batch_id: signed.batch_id, note: opts.note || '', files: uploaded }),
  });
  const recorded = await recordRes.json().catch(() => ({}));
  if (!recordRes.ok) throw new Error(recorded?.error || 'Upload finished but could not be filed.');
  return { received: recorded.received ?? uploaded.length, results };
}
