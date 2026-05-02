import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
    ArrowDownTrayIcon,
    MagnifyingGlassIcon,
    FilmIcon,
    DocumentIcon,
    PhotoIcon,
    CloudArrowDownIcon,
    XMarkIcon,
} from '@heroicons/react/24/outline';

const FILE_ID_RE = /^[a-zA-Z0-9_-]{20,}$/;

function extractFileId(input: string): string | null {
    const trimmed = input.trim();
    if (!trimmed) return null;
    if (FILE_ID_RE.test(trimmed)) return trimmed;
    const patterns = [
        /\/file\/d\/([a-zA-Z0-9_-]{20,})/,
        /[?&]id=([a-zA-Z0-9_-]{20,})/,
        /\/d\/([a-zA-Z0-9_-]{20,})/,
        /open\?id=([a-zA-Z0-9_-]{20,})/,
    ];
    for (const p of patterns) {
        const m = trimmed.match(p);
        if (m) return m[1];
    }
    return null;
}

function formatBytes(bytes: number): string {
    if (!bytes || Number.isNaN(bytes)) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function MimeIcon({ mime }: { mime: string }) {
    if (mime.startsWith('video/')) return <FilmIcon className="w-5 h-5" />;
    if (mime.startsWith('image/')) return <PhotoIcon className="w-5 h-5" />;
    return <DocumentIcon className="w-5 h-5" />;
}

interface FileInfo {
    id: string;
    name: string;
    size?: string;
    mimeType: string;
    createdTime?: string;
    modifiedTime?: string;
    md5Checksum?: string;
    isWorkspaceFile?: boolean;
    downloadUrl: string;
    expiresAt: string;
}

interface HistoryEntry {
    id: string;
    name: string;
    mimeType: string;
    size?: string;
    at: number;
}

const HISTORY_KEY = 'admin_drive_download_history';

function loadHistory(): HistoryEntry[] {
    try {
        const raw = localStorage.getItem(HISTORY_KEY);
        if (!raw) return [];
        return JSON.parse(raw) as HistoryEntry[];
    } catch {
        return [];
    }
}

function saveHistory(entries: HistoryEntry[]) {
    try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(entries.slice(0, 20)));
    } catch {
        /* ignore */
    }
}

export default function AdminDriveDownload() {
    const { user } = useAuth();
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [info, setInfo] = useState<FileInfo | null>(null);
    const [history, setHistory] = useState<HistoryEntry[]>(() => loadHistory());

    async function lookup(rawInput?: string) {
        setError(null);
        setInfo(null);
        const value = (rawInput ?? input).trim();
        const fileId = extractFileId(value);
        if (!fileId) {
            setError('Could not extract a Google Drive file ID from that URL.');
            return;
        }
        setLoading(true);
        try {
            const res = await fetch(
                `/api/admin/drive-download?action=info&fileId=${encodeURIComponent(fileId)}`,
                { headers: { 'X-Admin-Email': user?.email || '' } }
            );
            const data = await res.json();
            if (!res.ok) {
                setError(data?.error || `Lookup failed (${res.status}).`);
                return;
            }
            setInfo(data as FileInfo);

            const next: HistoryEntry[] = [
                {
                    id: data.id,
                    name: data.name,
                    mimeType: data.mimeType,
                    size: data.size,
                    at: Date.now(),
                },
                ...history.filter((h) => h.id !== data.id),
            ];
            setHistory(next);
            saveHistory(next);
        } catch (e: any) {
            setError(e?.message || 'Network error during lookup.');
        } finally {
            setLoading(false);
        }
    }

    function clearHistory() {
        setHistory([]);
        saveHistory([]);
    }

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                    <CloudArrowDownIcon className="w-4 h-4" />
                    Drive Download Portal
                </h3>
                <p className="text-white/30 text-xs mt-1">
                    Paste a Google Drive file URL or ID. Files are streamed through the service account
                    and downloaded directly to this device — works for videos that Drive refuses to
                    serve through the normal interface.
                </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') void lookup();
                    }}
                    placeholder="https://drive.google.com/file/d/...  or  fileId"
                    className="flex-1 bg-white/5 px-3 py-2 text-white text-xs font-mono placeholder-white/30 focus:bg-white/10 outline-none"
                />
                <button
                    onClick={() => void lookup()}
                    disabled={loading || !input.trim()}
                    className="bg-white text-black px-4 py-2 text-[10px] font-black uppercase tracking-widest hover:bg-white/80 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    <MagnifyingGlassIcon className="w-3.5 h-3.5" />
                    {loading ? 'Loading…' : 'Lookup'}
                </button>
            </div>

            {error && (
                <div className="bg-red-500/10 px-3 py-2 text-red-300 text-xs">{error}</div>
            )}

            {info && (
                <div className="bg-white/5 p-4 space-y-4">
                    <div className="flex items-start gap-3">
                        <div className="text-white/60 mt-0.5">
                            <MimeIcon mime={info.mimeType} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40 mb-1">
                                File
                            </p>
                            <p className="text-white text-sm font-bold break-all">{info.name}</p>
                            <p className="text-white/30 text-[10px] font-mono break-all mt-1">
                                ID: {info.id}
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40 mb-1">
                                Size
                            </p>
                            <p className="text-white text-xs font-mono">
                                {info.size ? formatBytes(Number(info.size)) : '—'}
                            </p>
                        </div>
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40 mb-1">
                                Type
                            </p>
                            <p className="text-white text-xs font-mono break-all">{info.mimeType}</p>
                        </div>
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40 mb-1">
                                Modified
                            </p>
                            <p className="text-white text-xs font-mono">
                                {info.modifiedTime
                                    ? new Date(info.modifiedTime).toLocaleDateString()
                                    : '—'}
                            </p>
                        </div>
                    </div>

                    {info.isWorkspaceFile && (
                        <p className="text-amber-300/80 text-[10px]">
                            Native Google Workspace file — will be exported on download.
                        </p>
                    )}

                    <a
                        href={info.downloadUrl}
                        download={info.name}
                        className="block w-full bg-white text-black px-4 py-3 text-xs font-black uppercase tracking-widest hover:bg-white/80 text-center"
                    >
                        <span className="inline-flex items-center justify-center gap-2">
                            <ArrowDownTrayIcon className="w-4 h-4" />
                            Download to Device
                        </span>
                    </a>
                    <p className="text-white/30 text-[10px]">
                        Link valid until {new Date(info.expiresAt).toLocaleTimeString()}. On iOS this
                        will save to your Files app; on Android it goes to Downloads.
                    </p>
                </div>
            )}

            {history.length > 0 && (
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40">
                            Recent Lookups
                        </p>
                        <button
                            onClick={clearHistory}
                            className="text-white/30 hover:text-white text-[10px] uppercase tracking-widest flex items-center gap-1"
                        >
                            <XMarkIcon className="w-3 h-3" />
                            Clear
                        </button>
                    </div>
                    <div className="space-y-1">
                        {history.map((h) => (
                            <button
                                key={`${h.id}-${h.at}`}
                                onClick={() => {
                                    setInput(h.id);
                                    void lookup(h.id);
                                }}
                                className="w-full flex items-center gap-3 p-2 bg-white/[0.03] hover:bg-white/[0.06] text-left transition-colors"
                            >
                                <div className="text-white/60 flex-shrink-0">
                                    <MimeIcon mime={h.mimeType} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-white text-xs font-bold truncate">{h.name}</p>
                                    <p className="text-white/30 text-[10px] font-mono truncate">
                                        {h.size ? formatBytes(Number(h.size)) : ''} · {h.mimeType}
                                    </p>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
