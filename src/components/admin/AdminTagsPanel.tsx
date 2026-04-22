import { useState, useEffect } from 'react';
import { PlusIcon, PencilIcon, TrashIcon, CheckIcon, XMarkIcon, TagIcon } from '@heroicons/react/24/outline';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast';

type TagType = 'location' | 'venue' | 'collection' | 'people' | 'event' | 'custom';

interface Tag {
    id: string;
    name: string;
    type: TagType;
    slug: string;
    metadata: Record<string, any> | null;
    created_at: string;
    photo_count?: number;
}

const TAG_TYPES: TagType[] = ['location', 'venue', 'collection', 'people', 'event', 'custom'];

const TYPE_COLORS: Record<TagType, string> = {
    location: 'text-blue-400 border-blue-400/30 bg-blue-400/10',
    venue: 'text-purple-400 border-purple-400/30 bg-purple-400/10',
    collection: 'text-green-400 border-green-400/30 bg-green-400/10',
    people: 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10',
    event: 'text-orange-400 border-orange-400/30 bg-orange-400/10',
    custom: 'text-white/60 border-white/20 bg-white/5',
};

function slugify(name: string, type: string) {
    const base = name.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim();
    return `${type}-${base}`;
}

const EMPTY_FORM = { name: '', type: 'collection' as TagType, latitude: '', longitude: '' };

export default function AdminTagsPanel() {
    const { session } = useAuth();
    const { success, error: toastError } = useToast();

    const [tags, setTags] = useState<Tag[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterType, setFilterType] = useState<TagType | 'all'>('all');
    const [searchQuery, setSearchQuery] = useState('');

    // Create form
    const [showCreate, setShowCreate] = useState(false);
    const [createForm, setCreateForm] = useState(EMPTY_FORM);
    const [creating, setCreating] = useState(false);

    // Edit form
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);

    const authHeader = { Authorization: `Bearer ${session?.access_token}` };

    useEffect(() => {
        loadTags();
    }, []);

    async function loadTags() {
        setLoading(true);
        try {
            // Fetch tags with photo counts via a join
            const { data: tagData, error } = await supabase
                .from('tags')
                .select('*, photo_tags(count)')
                .order('type')
                .order('name');
            if (error) throw error;

            const mapped = (tagData || []).map((t: any) => ({
                ...t,
                photo_count: t.photo_tags?.[0]?.count ?? 0,
            }));
            setTags(mapped);
        } catch (e: any) {
            toastError(e.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleCreate() {
        if (!createForm.name.trim()) return;
        setCreating(true);
        try {
            const metadata: Record<string, any> = {};
            if (createForm.latitude) metadata.latitude = parseFloat(createForm.latitude);
            if (createForm.longitude) metadata.longitude = parseFloat(createForm.longitude);

            const res = await fetch('/api/tags', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...authHeader },
                body: JSON.stringify({
                    name: createForm.name.trim(),
                    type: createForm.type,
                    metadata: Object.keys(metadata).length ? metadata : undefined,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            success(`Tag "${data.name}" created`);
            setCreateForm(EMPTY_FORM);
            setShowCreate(false);
            await loadTags();
        } catch (e: any) {
            toastError(e.message);
        } finally {
            setCreating(false);
        }
    }

    function startEdit(tag: Tag) {
        setEditingId(tag.id);
        setEditForm({
            name: tag.name,
            type: tag.type,
            latitude: tag.metadata?.latitude?.toString() ?? '',
            longitude: tag.metadata?.longitude?.toString() ?? '',
        });
    }

    async function handleSaveEdit(tag: Tag) {
        setSaving(true);
        try {
            const metadata: Record<string, any> = { ...tag.metadata };
            if (editForm.latitude) metadata.latitude = parseFloat(editForm.latitude);
            else delete metadata.latitude;
            if (editForm.longitude) metadata.longitude = parseFloat(editForm.longitude);
            else delete metadata.longitude;

            const res = await fetch(`/api/tags/${tag.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', ...authHeader },
                body: JSON.stringify({
                    name: editForm.name.trim(),
                    metadata: Object.keys(metadata).length ? metadata : null,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            success('Tag updated');
            setEditingId(null);
            await loadTags();
        } catch (e: any) {
            toastError(e.message);
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete(tag: Tag) {
        if (!confirm(`Delete tag "${tag.name}"? This will remove it from all ${tag.photo_count} photos.`)) return;
        try {
            const res = await fetch(`/api/tags/${tag.id}`, {
                method: 'DELETE',
                headers: authHeader,
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error);
            }
            success(`Tag "${tag.name}" deleted`);
            await loadTags();
        } catch (e: any) {
            toastError(e.message);
        }
    }

    const showGpsFields = (type: TagType) => type === 'venue' || type === 'location';

    const filteredTags = tags.filter(t => {
        if (filterType !== 'all' && t.type !== filterType) return false;
        if (searchQuery && !t.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return true;
    });

    const groupedTags = TAG_TYPES.reduce<Record<string, Tag[]>>((acc, type) => {
        const typeTags = filteredTags.filter(t => t.type === type);
        if (typeTags.length > 0) acc[type] = typeTags;
        return acc;
    }, {});

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-widest">
                        Tags ({tags.length})
                    </h3>
                    <p className="text-white/30 text-xs mt-1">Organize photos with location, venue, collection, and people tags</p>
                </div>
                <button
                    onClick={() => { setShowCreate(v => !v); setEditingId(null); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-black text-xs font-bold uppercase tracking-widest hover:bg-white/80 transition-colors"
                >
                    <PlusIcon className="w-3 h-3" />
                    New Tag
                </button>
            </div>

            {/* Create Form */}
            {showCreate && (
                <div className="bg-white/5 border border-white/10 p-4 space-y-3">
                    <p className="text-white/60 text-[10px] uppercase tracking-widest font-bold">New Tag</p>
                    <div className="grid grid-cols-2 gap-3">
                        <input
                            type="text"
                            placeholder="Tag name"
                            value={createForm.name}
                            onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))}
                            className="bg-black border border-white/20 text-white text-xs px-3 py-2 placeholder-white/20 focus:outline-none focus:border-white/50"
                            onKeyDown={e => e.key === 'Enter' && handleCreate()}
                            autoFocus
                        />
                        <select
                            value={createForm.type}
                            onChange={e => setCreateForm(f => ({ ...f, type: e.target.value as TagType }))}
                            className="bg-black border border-white/20 text-white text-xs px-3 py-2 focus:outline-none focus:border-white/50"
                        >
                            {TAG_TYPES.map(t => (
                                <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                            ))}
                        </select>
                    </div>
                    {showGpsFields(createForm.type) && (
                        <div className="grid grid-cols-2 gap-3">
                            <input
                                type="number"
                                step="any"
                                placeholder="Latitude (e.g. 30.2672)"
                                value={createForm.latitude}
                                onChange={e => setCreateForm(f => ({ ...f, latitude: e.target.value }))}
                                className="bg-black border border-white/20 text-white text-xs px-3 py-2 placeholder-white/20 focus:outline-none focus:border-white/50"
                            />
                            <input
                                type="number"
                                step="any"
                                placeholder="Longitude (e.g. -97.7431)"
                                value={createForm.longitude}
                                onChange={e => setCreateForm(f => ({ ...f, longitude: e.target.value }))}
                                className="bg-black border border-white/20 text-white text-xs px-3 py-2 placeholder-white/20 focus:outline-none focus:border-white/50"
                            />
                        </div>
                    )}
                    <p className="text-white/20 text-[9px] font-mono">
                        slug: {slugify(createForm.name || 'name', createForm.type)}
                    </p>
                    <div className="flex gap-2">
                        <button
                            onClick={handleCreate}
                            disabled={creating || !createForm.name.trim()}
                            className="px-4 py-1.5 bg-white text-black text-xs font-bold uppercase tracking-widest hover:bg-white/80 disabled:opacity-40 transition-colors"
                        >
                            {creating ? 'Creating…' : 'Create'}
                        </button>
                        <button
                            onClick={() => { setShowCreate(false); setCreateForm(EMPTY_FORM); }}
                            className="px-4 py-1.5 text-white/40 text-xs uppercase tracking-widest hover:text-white transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="flex items-center gap-3 flex-wrap">
                <input
                    type="text"
                    placeholder="Search tags…"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="bg-black border border-white/20 text-white text-xs px-3 py-1.5 placeholder-white/20 focus:outline-none focus:border-white/50 w-40"
                />
                <div className="flex gap-1">
                    <button
                        onClick={() => setFilterType('all')}
                        className={`px-2 py-1 text-[9px] uppercase font-bold tracking-widest border transition-colors ${filterType === 'all' ? 'bg-white text-black border-white' : 'text-white/40 border-white/20 hover:text-white'}`}
                    >
                        All
                    </button>
                    {TAG_TYPES.map(t => (
                        <button
                            key={t}
                            onClick={() => setFilterType(t)}
                            className={`px-2 py-1 text-[9px] uppercase font-bold tracking-widest border transition-colors ${filterType === t ? 'bg-white text-black border-white' : 'text-white/40 border-white/20 hover:text-white'}`}
                        >
                            {t}
                        </button>
                    ))}
                </div>
            </div>

            {/* Tag List */}
            {loading ? (
                <p className="text-white/30 text-xs py-4">Loading tags…</p>
            ) : filteredTags.length === 0 ? (
                <p className="text-white/30 text-xs py-4 italic">
                    {tags.length === 0 ? 'No tags yet. Create one above.' : 'No tags match your filter.'}
                </p>
            ) : (
                <div className="space-y-6">
                    {Object.entries(groupedTags).map(([type, typeTags]) => (
                        <div key={type}>
                            <p className={`text-[9px] font-black uppercase tracking-[0.2em] mb-2 ${TYPE_COLORS[type as TagType].split(' ')[0]}`}>
                                {type} ({typeTags.length})
                            </p>
                            <div className="space-y-1">
                                {typeTags.map(tag => (
                                    <div key={tag.id} className="flex items-center gap-3 p-2.5 bg-white/[0.03] hover:bg-white/[0.06] transition-colors group">
                                        {editingId === tag.id ? (
                                            /* Edit row */
                                            <div className="flex-1 flex items-center gap-2 flex-wrap">
                                                <input
                                                    type="text"
                                                    value={editForm.name}
                                                    onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                                                    className="bg-black border border-white/30 text-white text-xs px-2 py-1 focus:outline-none focus:border-white/60 w-36"
                                                    autoFocus
                                                    onKeyDown={e => e.key === 'Enter' && handleSaveEdit(tag)}
                                                />
                                                {showGpsFields(tag.type) && (
                                                    <>
                                                        <input
                                                            type="number" step="any" placeholder="Lat"
                                                            value={editForm.latitude}
                                                            onChange={e => setEditForm(f => ({ ...f, latitude: e.target.value }))}
                                                            className="bg-black border border-white/30 text-white text-xs px-2 py-1 focus:outline-none focus:border-white/60 w-28"
                                                        />
                                                        <input
                                                            type="number" step="any" placeholder="Lng"
                                                            value={editForm.longitude}
                                                            onChange={e => setEditForm(f => ({ ...f, longitude: e.target.value }))}
                                                            className="bg-black border border-white/30 text-white text-xs px-2 py-1 focus:outline-none focus:border-white/60 w-28"
                                                        />
                                                    </>
                                                )}
                                                <button onClick={() => handleSaveEdit(tag)} disabled={saving} className="text-green-400 hover:text-green-300 disabled:opacity-40">
                                                    <CheckIcon className="w-3.5 h-3.5" />
                                                </button>
                                                <button onClick={() => setEditingId(null)} className="text-white/30 hover:text-white">
                                                    <XMarkIcon className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        ) : (
                                            /* Display row */
                                            <>
                                                <TagIcon className="w-3 h-3 text-white/20 flex-shrink-0" />
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-white text-xs font-bold truncate">{tag.name}</span>
                                                        <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 border ${TYPE_COLORS[tag.type]}`}>
                                                            {tag.type}
                                                        </span>
                                                        {tag.metadata?.latitude && (
                                                            <span className="text-white/20 text-[9px] font-mono">
                                                                📍 {Number(tag.metadata.latitude).toFixed(4)}, {Number(tag.metadata.longitude).toFixed(4)}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-white/20 text-[9px] font-mono">{tag.slug}</p>
                                                </div>
                                                <span className="text-white/20 text-[9px] font-mono flex-shrink-0">
                                                    {tag.photo_count} {tag.photo_count === 1 ? 'photo' : 'photos'}
                                                </span>
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => startEdit(tag)}
                                                        className="p-1 text-white/30 hover:text-white transition-colors"
                                                        title="Edit tag"
                                                    >
                                                        <PencilIcon className="w-3 h-3" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(tag)}
                                                        className="p-1 text-white/30 hover:text-red-400 transition-colors"
                                                        title="Delete tag"
                                                    >
                                                        <TrashIcon className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
