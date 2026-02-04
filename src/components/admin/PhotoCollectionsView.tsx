import { useState, useEffect } from 'react';
import {
    CameraIcon,
    PlusIcon,
    MagnifyingGlassIcon,
    UserIcon,
    LinkIcon,
    TrashIcon,
    CheckCircleIcon,
    XCircleIcon,
    ArrowTopRightOnSquareIcon,
    ChevronRightIcon,
    EllipsisVerticalIcon,
    EnvelopeIcon,
    FolderPlusIcon
} from '@heroicons/react/24/outline';
import { LoadingSpinner } from '../Loading';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/Toast';

interface PhotoCollection {
    id: string;
    name: string;
    slug: string;
    description: string;
    google_drive_folder_id: string;
    user_id: string | null;
    is_private: boolean;
    created_at: string;
    user_email?: string;
}

interface UserProfile {
    id: string;
    email: string;
    username: string | null;
}

export default function PhotoCollectionsView() {
    const { success, error: showError } = useToast();
    const [collections, setCollections] = useState<PhotoCollection[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showOnboardForm, setShowOnboardForm] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        clientName: '',
        email: '',
        driveLink: '',
        isPrivate: true
    });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchCollections();
    }, []);

    async function fetchCollections() {
        try {
            setLoading(true);
            // Fetch collections and join with users via a secondary query since we can't easily join auth.users
            const { data, error } = await supabase
                .from('photo_libraries')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Fetch user emails for the collections
            const userIds = data?.filter(c => c.user_id).map(c => c.user_id) || [];

            let userMap: Record<string, string> = {};

            if (userIds.length > 0) {
                const { data: userData } = await supabase
                    .from('user_roles')
                    .select('user_id, email')
                    .in('user_id', userIds);

                userData?.forEach(u => {
                    userMap[u.user_id] = u.email;
                });
            }

            setCollections(data?.map(c => ({
                ...c,
                user_email: userMap[c.user_id || ''] || 'No associated user'
            })) || []);
        } catch (err: any) {
            console.error('Error fetching collections:', err);
            showError('Failed to load collections');
        } finally {
            setLoading(false);
        }
    }

    const handleOnboard = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            // 1. Find or verify user by email
            // Note: Admin can't easily create users via client SDK without Admin API
            // So we'll check if user exists in user_roles
            const { data: userData, error: userError } = await supabase
                .from('user_roles')
                .select('user_id')
                .eq('email', formData.email)
                .maybeSingle();

            if (!userData) {
                showError('Client must have a registered account first. Ask them to sign up.');
                setSubmitting(false);
                return;
            }

            const match = formData.driveLink.match(/\/folders\/([a-zA-Z0-9-_]+)/) ||
                formData.driveLink.match(/id=([a-zA-Z0-9-_]+)/) ||
                formData.driveLink.match(/^([a-zA-Z0-9-_]+)$/);
            const folderId = match ? match[1] : formData.driveLink;

            // 3. Create Library
            const slug = formData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

            const { data: libData, error: libError } = await supabase
                .from('photo_libraries')
                .insert({
                    name: formData.name,
                    slug,
                    description: `A private collection for ${formData.clientName}`,
                    google_drive_folder_id: folderId,
                    user_id: userData.user_id,
                    is_private: formData.isPrivate
                })
                .select()
                .single();

            if (libError) throw libError;

            success('Client collection created successfully!');
            setShowOnboardForm(false);
            setFormData({ name: '', clientName: '', email: '', driveLink: '', isPrivate: true });
            fetchCollections();

            // 4. Trigger Sync (TODO: Create sync API)
            triggerSync(libData.slug);

        } catch (err: any) {
            console.error('Onboarding error:', err);
            showError(err.message || 'Failed to onboard client');
        } finally {
            setSubmitting(false);
        }
    };

    const triggerSync = async (slug: string) => {
        try {
            const res = await fetch('/api/admin/sync-photos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ slug })
            });
            const data = await res.json();
            if (res.ok) {
                success(`Successfully synced ${data.synced} photos for ${slug}.`);
            } else {
                showError(data.error || 'Sync failed');
            }
        } catch (err) {
            showError('Failed to trigger sync');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this collection and ALL its photos?')) return;

        try {
            const { error } = await supabase.from('photo_libraries').delete().eq('id', id);
            if (error) throw error;
            success('Collection deleted');
            fetchCollections();
        } catch (err) {
            showError('Delete failed');
        }
    };

    const filteredCollections = collections.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.user_email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                        <CameraIcon className="w-6 h-6" />
                        PHOTO COLLECTIONS
                    </h2>
                    <p className="text-zinc-500 text-sm">Manage client photo galleries and associations.</p>
                </div>

                <button
                    onClick={() => setShowOnboardForm(!showOnboardForm)}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-white text-black font-bold uppercase tracking-tighter hover:bg-zinc-200 transition"
                >
                    {showOnboardForm ? <ChevronRightIcon className="w-5 h-5" /> : <PlusIcon className="w-5 h-5" />}
                    {showOnboardForm ? 'Close Form' : 'Onboard Client'}
                </button>
            </div>

            {showOnboardForm && (
                <div className="bg-zinc-900 p-6 rounded-none animate-in fade-in slide-in-from-top-4 duration-300">
                    <form onSubmit={handleOnboard} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-black text-zinc-500 uppercase tracking-widest">Gallery Name</label>
                                <input
                                    required
                                    type="text"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="e.g. Kattitude Tattoo Studio"
                                    className="w-full bg-black p-3 text-white focus:border-white focus:outline-none transition"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-black text-zinc-500 uppercase tracking-widest">Client Full Name</label>
                                <input
                                    required
                                    type="text"
                                    value={formData.clientName}
                                    onChange={e => setFormData({ ...formData, clientName: e.target.value })}
                                    placeholder="e.g. John Doe"
                                    className="w-full bg-black p-3 text-white focus:border-white focus:outline-none transition"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-black text-zinc-500 uppercase tracking-widest">Client Email (Account Email)</label>
                                <input
                                    required
                                    type="email"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="client@example.com"
                                    className="w-full bg-black p-3 text-white focus:border-white focus:outline-none transition"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-black text-zinc-500 uppercase tracking-widest">Google Drive Folder Link or ID</label>
                                <input
                                    required
                                    type="text"
                                    value={formData.driveLink}
                                    onChange={e => {
                                        const val = e.target.value;
                                        const match = val.match(/\/folders\/([a-zA-Z0-9-_]+)/) || val.match(/id=([a-zA-Z0-9-_]+)/);
                                        setFormData({ ...formData, driveLink: match ? match[1] : val });
                                    }}
                                    placeholder="Paste link or ID..."
                                    className="w-full bg-black p-3 text-white focus:border-white focus:outline-none transition"
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-2 py-2">
                            <input
                                type="checkbox"
                                id="isPrivate"
                                checked={formData.isPrivate}
                                onChange={e => setFormData({ ...formData, isPrivate: e.target.checked })}
                                className="w-4 h-4 accent-white"
                            />
                            <label htmlFor="isPrivate" className="text-sm text-zinc-300">Set as Private Gallery (Only visible to Client & Admin)</label>
                        </div>

                        <button
                            disabled={submitting}
                            className="w-full md:w-auto px-8 py-3 bg-white text-black font-black uppercase tracking-tighter hover:bg-zinc-200 transition disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {submitting ? <LoadingSpinner size="sm" /> : <FolderPlusIcon className="w-5 h-5" />}
                            Create Client Collection
                        </button>
                    </form>
                </div>
            )}

            {/* Collections List */}
            <div className="bg-zinc-900 p-6 rounded-none">
                <div className="mb-6 relative">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input
                        type="text"
                        placeholder="Filter collections by name or email..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full bg-black pl-10 pr-4 py-2 text-white text-sm focus:border-white focus:outline-none transition"
                    />
                </div>

                <div className="space-y-3">
                    {loading ? (
                        <div className="py-20 flex flex-col items-center justify-center text-zinc-600">
                            <LoadingSpinner size="lg" className="mb-2" />
                            <p className="text-xs uppercase font-black tracking-widest">Loading Collections...</p>
                        </div>
                    ) : filteredCollections.length > 0 ? (
                        filteredCollections.map(collection => (
                            <div key={collection.id} className="group flex flex-col md:flex-row md:items-center justify-between p-4 bg-black hover:border-white/20 transition">
                                <div className="flex items-center gap-4 mb-4 md:mb-0">
                                    <div className="w-12 h-12 bg-zinc-900 flex items-center justify-center">
                                        <CameraIcon className="w-6 h-6 text-zinc-600 group-hover:text-white transition" />
                                    </div>
                                    <div>
                                        <h3 className="text-white font-black uppercase text-sm flex items-center gap-2">
                                            {collection.name}
                                            {collection.is_private ? (
                                                <span className="px-2 py-0.5 bg-zinc-800 text-[10px] text-zinc-500 border border-white/10">PRIVATE</span>
                                            ) : (
                                                <span className="px-2 py-0.5 bg-green-500/10 text-[10px] text-green-500 border border-green-500/20">PUBLIC</span>
                                            )}
                                        </h3>
                                        <div className="flex flex-col text-[11px] text-zinc-500 font-mono mt-1">
                                            <span className="flex items-center gap-1">
                                                <UserIcon className="w-3 h-3" /> {collection.user_email}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <LinkIcon className="w-3 h-3" /> /{collection.slug}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <a
                                        href={`/thelostarchives/${collection.slug}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="p-2 bg-zinc-900 text-zinc-400 hover:text-white hover:border-white/30 transition"
                                        title="View Collection"
                                    >
                                        <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                                    </a>
                                    <button
                                        onClick={() => triggerSync(collection.slug)}
                                        className="p-2 bg-zinc-900 text-zinc-400 hover:text-white hover:border-white/30 transition"
                                        title="Refresh Data"
                                    >
                                        ↻
                                    </button>
                                    <button
                                        onClick={() => handleDelete(collection.id)}
                                        className="p-2 bg-zinc-900 text-zinc-400 hover:text-red-500 hover:border-red-500/30 transition"
                                        title="Delete Collection"
                                    >
                                        <TrashIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-20 text-zinc-600 border border-dashed border-white/5">
                            <CameraIcon className="w-12 h-12 mx-auto mb-4 opacity-10" />
                            <p className="text-xs uppercase font-black tracking-widest">No Collections Found</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
