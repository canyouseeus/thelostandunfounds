/**
 * Optional brand assets on the booking form: a logo, brand guide, fonts.
 *
 * Files are only queued here. Once the booking saves, the server hands back
 * that booking's upload link and the booking page sends them through it
 * (src/lib/clientUploadSend.ts) — same path as /upload/:token, so they land in
 * the booking's Drive folder and the studio is emailed.
 */

import { useRef } from 'react';
import { ArrowUpTrayIcon, XMarkIcon } from '@heroicons/react/24/outline';

export const BRAND_ASSET_MAX_FILES = 10;
export const BRAND_ASSET_MAX_MB = 100;
// The upload link refuses SVG and anything executable (client-uploads handler).
const ACCEPT = 'image/*,application/pdf,application/zip,application/postscript,.ai,.eps,.psd,.zip,.pdf';
const BLOCKED = /\.(svg|exe|bat|cmd|sh|js|mjs|php|jar|msi|dll|scr|com|vbs|ps1|html?)$/i;

export function checkBrandAsset(file: File): string | null {
  if (BLOCKED.test(file.name)) {
    return /\.svg$/i.test(file.name)
      ? `${file.name}: SVG can't be uploaded. Send it as a PDF or a transparent PNG.`
      : `${file.name}: that file type isn't accepted.`;
  }
  if (file.size > BRAND_ASSET_MAX_MB * 1024 * 1024) return `${file.name} is over ${BRAND_ASSET_MAX_MB}MB.`;
  return null;
}

function size(bytes: number): string {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function BrandAssetPicker({ files, onChange, onError }: {
  files: File[];
  onChange: (files: File[]) => void;
  onError: (message: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const add = (list: FileList | null) => {
    const picked = Array.from(list || []);
    const problems: string[] = [];
    const seen = new Set(files.map(f => `${f.name}:${f.size}`));
    const next = [...files];
    for (const f of picked) {
      const problem = checkBrandAsset(f);
      if (problem) { problems.push(problem); continue; }
      if (seen.has(`${f.name}:${f.size}`)) continue;
      if (next.length >= BRAND_ASSET_MAX_FILES) { problems.push(`Up to ${BRAND_ASSET_MAX_FILES} files here; you can send more after booking.`); break; }
      next.push(f);
      seen.add(`${f.name}:${f.size}`);
    }
    onChange(next);
    if (problems.length) onError(problems[0]);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div data-tour="booking-brand-assets" className="mb-6 text-left">
      <p className="text-white text-sm font-bold mb-1">Brand assets <span className="text-white/40 font-normal">(optional)</span></p>
      <p className="text-white/40 text-xs mb-3">
        Your logo, brand guide or fonts, so we can match them. A transparent PNG or a PDF, AI or EPS logo is best.
      </p>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="w-full flex items-center justify-center gap-2 px-4 py-4 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-[11px] font-black uppercase tracking-widest transition-colors"
        style={{ borderRadius: 0 }}
      >
        <ArrowUpTrayIcon className="w-4 h-4" />
        {files.length ? 'Add more files' : 'Add files'}
      </button>
      <input ref={inputRef} type="file" multiple accept={ACCEPT} className="hidden" onChange={e => add(e.target.files)} />
      {files.length > 0 && (
        <ul className="mt-2 space-y-1">
          {files.map((f, i) => (
            <li key={`${f.name}:${f.size}`} className="flex items-center gap-2 bg-white/[0.03] px-3 py-2">
              <span className="text-xs text-white/80 truncate flex-1 min-w-0">{f.name}</span>
              <span className="text-[10px] text-white/30 shrink-0">{size(f.size)}</span>
              <button
                type="button"
                onClick={() => onChange(files.filter((_, j) => j !== i))}
                className="p-1 text-white/40 hover:text-white shrink-0"
                aria-label={`Remove ${f.name}`}
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
