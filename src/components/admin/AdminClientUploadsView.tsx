/**
 * Content Requests: admin panel.
 *
 * Mint a link per person you're asking content from; a client, a contributor,
 * a photographer, a business that has photos sitting on a phone. Copy it into
 * an email, or have the platform send the email. Then review whatever comes
 * back. "Copy brief" produces a plain-text block naming every file and where it
 * lives, which is what gets handed to an agent to build a page from.
 *
 * The database columns still say `client_*`; the feature outgrew that name and
 * renaming live columns wasn't worth the migration.
 */

import { useEffect, useState } from 'react';
import {
    ArrowPathIcon,
    ClipboardDocumentIcon,
    LinkIcon,
    PaperAirplaneIcon,
    PlusIcon,
} from '@heroicons/react/24/outline';
import { supabase } from '../../lib/supabase';

interface UploadLink {
    id: string;
    token: string;
    client_name: string;
    client_email: string | null;
    project_name: string | null;
    intro: string | null;
    drive_folder_url: string | null;
    expires_at: string | null;
    max_files: number;
    max_file_mb: number;
    is_active: boolean;
    upload_count: number;
    last_upload_at: string | null;
    invited_at: string | null;
    created_at: string;
    upload_url: string;
}

interface Upload {
    id: string;
    file_name: string;
    mime_type: string | null;
    size_bytes: number | null;
    drive_view_url: string | null;
    drive_status: string;
    drive_error: string | null;
    uploader_note: string | null;
    preview_url: string | null;
    created_at: string;
}

const surface = { borderRadius: 0 } as const;

async function authFetch(url: string, init: RequestInit = {}) {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(url, {
        ...init,
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token || ''}`,
            ...(init.headers || {}),
        },
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body?.error || 'Request failed');
    return body;
}

export default function AdminClientUploadsView() {
    const [links, setLinks] = useState<UploadLink[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [status, setStatus] = useState<string | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [creating, setCreating] = useState(false);
    const [form, setForm] = useState({
        client_name: '',
        client_email: '',
        project_name: '',
        intro: '',
        expires_in_days: '',
    });

    const [openLinkId, setOpenLinkId] = useState<string | null>(null);
    const [uploads, setUploads] = useState<Upload[]>([]);
    const [uploadsLoading, setUploadsLoading] = useState(false);

    useEffect(() => { loadLinks(); }, []);

    // A link id can arrive from the "review them in the dashboard" button in the
    // notification email.
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const linkId = params.get('link');
        if (linkId) openUploads(linkId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function loadLinks() {
        setLoading(true);
        setError(null);
        try {
            const body = await authFetch('/api/client-uploads/links');
            setLinks(body.links || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    async function openUploads(linkId: string) {
        if (openLinkId === linkId) { setOpenLinkId(null); return; }
        setOpenLinkId(linkId);
        setUploadsLoading(true);
        try {
            const body = await authFetch(`/api/client-uploads/uploads?linkId=${linkId}`);
            setUploads(body.uploads || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setUploadsLoading(false);
        }
    }

    async function handleCreate() {
        if (!form.client_name.trim() || creating) return;
        setCreating(true);
        setError(null);
        try {
            const body = await authFetch('/api/client-uploads/links', {
                method: 'POST',
                body: JSON.stringify({
                    client_name: form.client_name,
                    client_email: form.client_email,
                    project_name: form.project_name,
                    intro: form.intro,
                    expires_in_days: form.expires_in_days ? Number(form.expires_in_days) : undefined,
                }),
            });
            setForm({ client_name: '', client_email: '', project_name: '', intro: '', expires_in_days: '' });
            setShowForm(false);
            flash(body.drive_error ? `Link created: Drive folder failed: ${body.drive_error}` : 'Link created');
            loadLinks();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setCreating(false);
        }
    }

    function flash(message: string) {
        setStatus(message);
        setTimeout(() => setStatus(null), 4000);
    }

    async function copy(text: string, label: string) {
        try {
            await navigator.clipboard.writeText(text);
            flash(`${label} copied`);
        } catch {
            setError('Could not access the clipboard');
        }
    }

    async function toggle(link: UploadLink) {
        try {
            await authFetch('/api/client-uploads/toggle', {
                method: 'POST',
                body: JSON.stringify({ id: link.id, is_active: !link.is_active }),
            });
            loadLinks();
        } catch (err: any) {
            setError(err.message);
        }
    }

    async function invite(link: UploadLink) {
        const email = link.client_email || window.prompt(`Email the link to which address?`) || '';
        if (!email.trim()) return;
        try {
            const body = await authFetch('/api/client-uploads/invite', {
                method: 'POST',
                body: JSON.stringify({ id: link.id, email }),
            });
            flash(`Sent to ${body.to} (cc ${body.cc})`);
            loadLinks();
        } catch (err: any) {
            setError(err.message);
        }
    }

    async function retry(link: UploadLink) {
        try {
            const body = await authFetch('/api/client-uploads/retry-mirror', {
                method: 'POST',
                body: JSON.stringify({ id: link.id }),
            });
            flash(`Mirrored ${body.mirrored} of ${body.retried}`);
            if (openLinkId === link.id) openUploads(link.id);
        } catch (err: any) {
            setError(err.message);
        }
    }

    // The hand-off block: everything an agent needs to pull the photos and put
    // them into a landing page.
    function briefFor(link: UploadLink): string {
        const lines = [
            `Content request: ${link.client_name}${link.project_name ? ` (${link.project_name})` : ''}`,
            link.drive_folder_url ? `Drive folder: ${link.drive_folder_url}` : 'Drive folder: (not created)',
            `Files: ${uploads.length}`,
            '',
        ];
        uploads.forEach((u, i) => {
            lines.push(`${i + 1}. ${u.file_name}${u.mime_type ? ` (${u.mime_type})` : ''}`);
            if (u.drive_view_url) lines.push(`   drive: ${u.drive_view_url}`);
            if (u.uploader_note && i === 0) lines.push(`   client note: ${u.uploader_note}`);
        });
        lines.push('', 'Use these to build the landing page.');
        return lines.join('\n');
    }

    return (
        <div className="space-y-6">
            {status && (
                <div className="bg-white/10 px-4 py-3 text-sm text-white" style={surface}>{status}</div>
            )}
            {error && (
                <div className="bg-red-500/10 px-4 py-3 text-sm text-red-400" style={surface}>{error}</div>
            )}

            <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-white/40 uppercase tracking-[0.3em]">
                    {links.length} request{links.length === 1 ? '' : 's'}
                </p>
                <div className="flex items-center gap-2">
                    <button
                        onClick={loadLinks}
                        className="p-2 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                        style={surface}
                        title="Refresh"
                    >
                        <ArrowPathIcon className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setShowForm(v => !v)}
                        className="flex items-center gap-2 px-4 py-2 bg-white text-black text-[10px] font-black uppercase tracking-[0.2em] hover:bg-white/90 transition-colors"
                        style={surface}
                    >
                        <PlusIcon className="w-4 h-4" /> New request
                    </button>
                </div>
            </div>

            {showForm && (
                <div className="bg-white/5 p-4 space-y-3" style={surface}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input
                            value={form.client_name}
                            onChange={e => setForm({ ...form, client_name: e.target.value })}
                            placeholder="Who you're asking *"
                            className="bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 focus:bg-white/10 focus:outline-none"
                            style={surface}
                        />
                        <input
                            value={form.project_name}
                            onChange={e => setForm({ ...form, project_name: e.target.value })}
                            placeholder="What it's for (optional)"
                            className="bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 focus:bg-white/10 focus:outline-none"
                            style={surface}
                        />
                        <input
                            value={form.client_email}
                            onChange={e => setForm({ ...form, client_email: e.target.value })}
                            placeholder="Their email (optional)"
                            className="bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 focus:bg-white/10 focus:outline-none"
                            style={surface}
                        />
                        <input
                            value={form.expires_in_days}
                            onChange={e => setForm({ ...form, expires_in_days: e.target.value })}
                            placeholder="Expires in days (blank = never)"
                            inputMode="numeric"
                            className="bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 focus:bg-white/10 focus:outline-none"
                            style={surface}
                        />
                    </div>
                    <textarea
                        value={form.intro}
                        onChange={e => setForm({ ...form, intro: e.target.value })}
                        rows={2}
                        placeholder="What you're asking them for; shown on their upload page"
                        className="w-full bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 focus:bg-white/10 focus:outline-none resize-none"
                        style={surface}
                    />
                    <button
                        onClick={handleCreate}
                        disabled={creating || !form.client_name.trim()}
                        title="Creates the link and its Drive folder"
                        className="px-4 py-2 bg-white text-black text-[10px] font-black uppercase tracking-[0.2em] disabled:bg-white/10 disabled:text-white/30 transition-colors"
                        style={surface}
                    >
                        {creating ? 'Creating…' : 'Create request link'}
                    </button>
                </div>
            )}

            {loading ? (
                <p className="text-white/40 text-sm">Loading…</p>
            ) : links.length === 0 ? (
                <p className="text-white/40 text-sm">No content requests yet.</p>
            ) : (
                <div className="space-y-2">
                    {links.map(link => (
                        <div key={link.id} className="bg-white/5" style={surface}>
                            <div className="p-4 flex flex-wrap items-center gap-3">
                                <div className="flex-1 min-w-[200px]">
                                    <p className="text-sm font-bold text-white">
                                        {link.client_name}
                                        {link.project_name && (
                                            <span className="text-white/40 font-normal">; {link.project_name}</span>
                                        )}
                                        {!link.is_active && (
                                            <span className="ml-2 px-2 py-0.5 bg-white/10 text-[9px] font-black uppercase tracking-widest text-white/60">
                                                Off
                                            </span>
                                        )}
                                    </p>
                                    <p className="text-xs text-white/40 mt-1 break-all">{link.upload_url}</p>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => copy(link.upload_url, 'Link')}
                                        className="flex items-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-white/10 text-[10px] font-black uppercase tracking-widest text-white transition-colors"
                                        style={surface}
                                    >
                                        <LinkIcon className="w-3.5 h-3.5" /> Copy link
                                    </button>
                                    <button
                                        onClick={() => invite(link)}
                                        className="flex items-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-white/10 text-[10px] font-black uppercase tracking-widest text-white transition-colors"
                                        style={surface}
                                    >
                                        <PaperAirplaneIcon className="w-3.5 h-3.5" /> Email it
                                    </button>
                                    <button
                                        onClick={() => openUploads(link.id)}
                                        className="px-3 py-2 bg-white/5 hover:bg-white/10 text-[10px] font-black uppercase tracking-widest text-white transition-colors tabular-nums"
                                        style={surface}
                                    >
                                        {link.upload_count} file{link.upload_count === 1 ? '' : 's'}
                                    </button>
                                    <button
                                        onClick={() => toggle(link)}
                                        className="px-3 py-2 bg-white/5 hover:bg-white/10 text-[10px] font-black uppercase tracking-widest text-white/60 hover:text-white transition-colors"
                                        style={surface}
                                    >
                                        {link.is_active ? 'Revoke' : 'Enable'}
                                    </button>
                                </div>
                            </div>

                            {openLinkId === link.id && (
                                <div className="px-4 pb-4 space-y-3">
                                    <div className="flex flex-wrap items-center gap-2">
                                        {link.drive_folder_url && (
                                            <a
                                                href={link.drive_folder_url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="px-3 py-2 bg-white/5 hover:bg-white/10 text-[10px] font-black uppercase tracking-widest text-white transition-colors"
                                                style={surface}
                                            >
                                                Open Drive folder →
                                            </a>
                                        )}
                                        <button
                                            onClick={() => copy(briefFor(link), 'Brief')}
                                            className="flex items-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-white/10 text-[10px] font-black uppercase tracking-widest text-white transition-colors"
                                            style={surface}
                                        >
                                            <ClipboardDocumentIcon className="w-3.5 h-3.5" /> Copy brief
                                        </button>
                                        {uploads.some(u => u.drive_status !== 'mirrored') && (
                                            <button
                                                onClick={() => retry(link)}
                                                className="px-3 py-2 bg-white/5 hover:bg-white/10 text-[10px] font-black uppercase tracking-widest text-amber-400 transition-colors"
                                                style={surface}
                                            >
                                                Retry Drive mirror
                                            </button>
                                        )}
                                    </div>

                                    {uploadsLoading ? (
                                        <p className="text-white/40 text-sm">Loading files…</p>
                                    ) : uploads.length === 0 ? (
                                        <p className="text-white/40 text-sm">Nothing uploaded yet.</p>
                                    ) : (
                                        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                                            {uploads.map(u => (
                                                <a
                                                    key={u.id}
                                                    href={u.drive_view_url || u.preview_url || '#'}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="block bg-white/5 hover:bg-white/10 transition-colors"
                                                    style={surface}
                                                    title={u.file_name}
                                                >
                                                    {u.preview_url && (u.mime_type || '').startsWith('image/') ? (
                                                        <img
                                                            src={u.preview_url}
                                                            alt={u.file_name}
                                                            loading="lazy"
                                                            className="w-full h-24 object-cover"
                                                            style={surface}
                                                        />
                                                    ) : (
                                                        <div className="w-full h-24 flex items-center justify-center text-[10px] uppercase tracking-widest text-white/40">
                                                            {(u.mime_type || 'file').split('/')[1] || 'file'}
                                                        </div>
                                                    )}
                                                    <p className="px-2 py-1.5 text-[10px] text-white/60 truncate">
                                                        {u.file_name}
                                                    </p>
                                                    {u.drive_status !== 'mirrored' && (
                                                        <p className="px-2 pb-1.5 text-[9px] uppercase tracking-widest text-amber-400">
                                                            Not in Drive
                                                        </p>
                                                    )}
                                                </a>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
