import { useState, useCallback } from 'react';
import { ClipboardCopy, Check, Loader } from 'lucide-react';
import { getEntries } from '../../lib/adminErrorLog';
import { useAuth } from '../../contexts/AuthContext';

export default function CopyDebugReport() {
  const { user } = useAuth();
  const [state, setState] = useState<'idle' | 'loading' | 'copied'>('idle');

  const handleCopy = useCallback(async () => {
    setState('loading');

    // Fetch server logs
    let serverSection = '_VERCEL_ACCESS_TOKEN not configured — server logs unavailable_';
    try {
      const r = await fetch('/api/admin/logs?since=' + (Date.now() - 30 * 60 * 1000), {
        headers: {
          'X-Admin-Email': user?.email || '',
          'Content-Type': 'application/json'
        }
      });
      const data = await r.json();
      if (data.error) {
        serverSection = `_${data.error}_`;
      } else if (data.lines?.length) {
        serverSection = '```\n' + data.lines.join('\n') + '\n```';
      } else {
        serverSection = '_No server logs in the last 30 minutes_';
      }
    } catch (e: any) {
      serverSection = `_Failed to fetch server logs: ${e.message}_`;
    }

    // Collect client-side log entries
    const entries = getEntries();
    const errorEntries = entries.filter(e => e.type === 'error');
    const apiEntries = entries.filter(e => e.type === 'api');

    const clientErrors = errorEntries.length
      ? errorEntries.map(e => `**${e.ts}**\n\`\`\`\n${e.message}\n\`\`\``).join('\n\n')
      : '_No client errors captured_';

    const apiLog = apiEntries.length
      ? '```\n' + apiEntries.map(e => `${e.ts}  ${e.message}`).join('\n') + '\n```'
      : '_No API calls logged_';

    const ua = navigator.userAgent;
    const markdown = `# Admin Debug Report
**Time:** ${new Date().toISOString()}
**URL:** ${window.location.href}
**User:** ${user?.email || 'unknown'}
**Device:** ${ua}

---

## Client Errors (last ${MAX_CLIENT} captured)

${clientErrors}

---

## Recent API Calls

${apiLog}

---

## Vercel Server Logs (last 30 min)

${serverSection}
`;

    try {
      await navigator.clipboard.writeText(markdown);
      setState('copied');
      setTimeout(() => setState('idle'), 2500);
    } catch {
      // Fallback for mobile browsers that block clipboard without gesture
      const el = document.createElement('textarea');
      el.value = markdown;
      el.style.position = 'fixed';
      el.style.opacity = '0';
      document.body.appendChild(el);
      el.focus();
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setState('copied');
      setTimeout(() => setState('idle'), 2500);
    }
  }, [user?.email]);

  return (
    <button
      onClick={handleCopy}
      disabled={state === 'loading'}
      title="Copy debug report as markdown"
      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border border-white/10 transition"
    >
      {state === 'loading' && <Loader className="w-3 h-3 animate-spin" />}
      {state === 'copied' && <Check className="w-3 h-3 text-green-400" />}
      {state === 'idle' && <ClipboardCopy className="w-3 h-3" />}
      {state === 'copied' ? 'Copied!' : 'Copy Debug Report'}
    </button>
  );
}

const MAX_CLIENT = 40;
