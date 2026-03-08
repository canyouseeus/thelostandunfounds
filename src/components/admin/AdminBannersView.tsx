
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../components/Toast';
import { LoadingSpinner } from '../Loading';
import { motion } from 'framer-motion';
import {
    MegaphoneIcon,
    PlusIcon,
    PencilSquareIcon,
    TrashIcon,
    TagIcon,
    GlobeAltIcon,
    ClockIcon,
    ArrowPathIcon,
    CheckCircleIcon,
    XCircleIcon,
    CalendarIcon
} from '@heroicons/react/24/outline';
import { cn } from '../../components/ui/utils';

interface BannerCampaign {
    id: string;
    title: string;
    image_url: string;
    link_url: string;
    owner_email: string;
    status: 'draft' | 'active' | 'completed' | 'cancelled';
    is_enterprise: boolean;
    created_at: string;
}

interface PublicSlot {
    slot_index: number;
    campaign_id: string;
    campaign_title: string;
    purchased_at: string;
}

interface EnterpriseReservation {
    id: string;
    campaign_id: string;
    campaign_title: string;
    surface: string;
    start_time: string;
    end_time: string;
}

export default function AdminBannersView() {
    const [campaigns, setCampaigns] = useState<BannerCampaign[]>([]);
    const [publicSlots, setPublicSlots] = useState<PublicSlot[]>([]);
    const [reservations, setReservations] = useState<EnterpriseReservation[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'campaigns' | 'queue' | 'enterprise'>('campaigns');
    const { success, error: showError } = useToast();

    // Form state
    const [showForm, setShowForm] = useState(false);
    const [editingCampaign, setEditingCampaign] = useState<BannerCampaign | null>(null);
    const [formData, setFormData] = useState({
        title: '',
        image_url: '',
        link_url: '',
        owner_email: '',
        is_enterprise: false,
        status: 'active' as 'draft' | 'active' | 'completed' | 'cancelled'
    });

    useEffect(() => {
        fetchData();
    }, []);

    async function fetchData() {
        setLoading(true);
        try {
            const [cR, sR, rR] = await Promise.all([
                supabase.from('banner_campaigns').select('*').order('created_at', { ascending: false }),
                supabase.from('banner_public_slots').select('*, banner_campaigns(title)').order('slot_index', { ascending: false }).limit(50),
                supabase.from('banner_enterprise_reservations').select('*, banner_campaigns(title)').order('start_time', { ascending: true })
            ]);

            if (cR.error) throw cR.error;
            setCampaigns(cR.data || []);

            setPublicSlots((sR.data || []).map(s => ({
                slot_index: s.slot_index,
                campaign_id: s.campaign_id,
                campaign_title: (s.banner_campaigns as any)?.title || 'Unknown',
                purchased_at: s.purchased_at
            })));

            setReservations((rR.data || []).map(r => ({
                id: r.id,
                campaign_id: r.campaign_id,
                campaign_title: (r.banner_campaigns as any)?.title || 'Unknown',
                surface: r.surface,
                start_time: r.start_time,
                end_time: r.end_time
            })));

        } catch (err: any) {
            console.error('Error fetching banner data:', err);
            showError('Failed to load marketplace data');
        } finally {
            setLoading(false);
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        try {
            if (editingCampaign) {
                const { error } = await supabase
                    .from('banner_campaigns')
                    .update(formData)
                    .eq('id', editingCampaign.id);
                if (error) throw error;
                success('Campaign updated');
            } else {
                const { error } = await supabase
                    .from('banner_campaigns')
                    .insert([formData]);
                if (error) throw error;
                success('Campaign created');
            }
            setShowForm(false);
            setEditingCampaign(null);
            fetchData();
        } catch (err: any) {
            showError(err.message);
        }
    }

    async function deleteCampaign(id: string) {
        if (!confirm('Are you sure you want to delete this campaign?')) return;
        try {
            const { error } = await supabase.from('banner_campaigns').delete().eq('id', id);
            if (error) throw error;
            success('Campaign deleted');
            fetchData();
        } catch (err: any) {
            showError(err.message);
        }
    }

    if (loading && campaigns.length === 0) {
        return <div className="flex justify-center p-12"><LoadingSpinner /></div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-black text-white uppercase tracking-tight">Banner Marketplace</h2>
                    <p className="text-xs text-white/40 uppercase tracking-widest mt-1">Manage public campaigns and enterprise blocks</p>
                </div>
                <button
                    onClick={() => {
                        setEditingCampaign(null);
                        setFormData({ title: '', image_url: '', link_url: '', owner_email: '', is_enterprise: false, status: 'active' });
                        setShowForm(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-white text-black text-[10px] font-black uppercase tracking-widest hover:bg-zinc-200 transition-colors"
                >
                    <PlusIcon className="w-4 h-4" />
                    New Campaign
                </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-white/5 p-1 border border-white/10">
                {(['campaigns', 'queue', 'enterprise'] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={cn(
                            "flex-1 py-2 text-[10px] font-black uppercase tracking-widest transition-all",
                            activeTab === tab ? "bg-white text-black" : "text-white/40 hover:text-white hover:bg-white/5"
                        )}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="bg-zinc-900/50 border border-white/5 overflow-hidden">
                {activeTab === 'campaigns' && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-white/10 bg-white/5">
                                    <th className="px-6 py-4 text-[10px] font-black text-white/40 uppercase tracking-widest">Campaign</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-white/40 uppercase tracking-widest">Owner</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-white/40 uppercase tracking-widest">Status</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-white/40 uppercase tracking-widest">Type</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-white/40 uppercase tracking-widest text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {campaigns.map(c => (
                                    <tr key={c.id} className="hover:bg-white/[0.02] transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-4">
                                                <img src={c.image_url} alt="" className="w-10 h-10 object-cover border border-white/10" />
                                                <div>
                                                    <p className="text-xs font-bold text-white uppercase tracking-tight">{c.title}</p>
                                                    <p className="text-[10px] text-white/40 truncate max-w-[200px]">{c.link_url}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-xs text-white/60 font-mono">{c.owner_email}</td>
                                        <td className="px-6 py-4">
                                            <span className={cn(
                                                "px-2 py-0.5 text-[8px] font-black uppercase tracking-widest border",
                                                c.status === 'active' ? "text-emerald-500 border-emerald-500/20 bg-emerald-500/10" : "text-white/40 border-white/10 bg-white/5"
                                            )}>
                                                {c.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {c.is_enterprise ? (
                                                <span className="flex items-center gap-1 text-[8px] font-black uppercase tracking-widest text-amber-500">
                                                    <TagIcon className="w-3 h-3" /> Enterprise
                                                </span>
                                            ) : (
                                                <span className="text-[8px] font-black uppercase tracking-widest text-white/40">Public</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => {
                                                        setEditingCampaign(c);
                                                        setFormData({
                                                            title: c.title,
                                                            image_url: c.image_url,
                                                            link_url: c.link_url,
                                                            owner_email: c.owner_email,
                                                            is_enterprise: c.is_enterprise,
                                                            status: c.status
                                                        });
                                                        setShowForm(true);
                                                    }}
                                                    className="p-1 text-white/40 hover:text-white transition-colors"
                                                >
                                                    <PencilSquareIcon className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => deleteCampaign(c.id)}
                                                    className="p-1 text-white/40 hover:text-red-500 transition-colors"
                                                >
                                                    <TrashIcon className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {activeTab === 'queue' && (
                    <div className="p-6">
                        <div className="bg-amber-500/10 border border-amber-500/20 p-4 mb-6">
                            <p className="text-[10px] font-black text-amber-500 uppercase tracking-[0.2em] mb-1">Queue Synchronisation</p>
                            <p className="text-xs text-amber-500/80 leading-relaxed font-light">
                                Slot rotation is granular (8 seconds). The slot index is shared across all surfaces.
                                Replaced banners persist in "Idle" mode if no successor is present.
                            </p>
                        </div>
                        <div className="space-y-2">
                            {publicSlots.map(s => (
                                <div key={s.slot_index} className="flex items-center justify-between p-3 bg-white/5 border border-white/10">
                                    <div className="flex items-center gap-4">
                                        <div className="text-[10px] font-mono text-white/20">#{s.slot_index}</div>
                                        <div>
                                            <p className="text-xs font-bold text-white uppercase tracking-tight">{s.campaign_title}</p>
                                            <p className="text-[8px] text-white/40 uppercase tracking-widest">Purchased {new Date(s.purchased_at).toLocaleString()}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <ClockIcon className="w-3 h-3 text-white/20" />
                                        <span className="text-[8px] text-white/20 font-mono tracking-tighter">LIVE IN RANGE</span>
                                    </div>
                                </div>
                            ))}
                            {publicSlots.length === 0 && (
                                <div className="text-center py-12">
                                    <MegaphoneIcon className="w-8 h-8 text-white/10 mx-auto mb-3" />
                                    <p className="text-[10px] text-white/40 uppercase tracking-widest">Queue is empty. "Idle" logic is active.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'enterprise' && (
                    <div className="p-6 space-y-4">
                        {reservations.map(r => (
                            <div key={r.id} className="p-4 bg-white/5 border border-amber-500/20 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                                        <TagIcon className="w-5 h-5 text-amber-500" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-white uppercase tracking-tight">{r.campaign_title}</p>
                                        <div className="flex items-center gap-3 mt-1">
                                            <span className="text-[8px] text-white/40 uppercase tracking-widest flex items-center gap-1">
                                                <GlobeAltIcon className="w-3 h-3" /> Surface: {r.surface}
                                            </span>
                                            <span className="text-[8px] text-white/40 uppercase tracking-widest flex items-center gap-1">
                                                <CalendarIcon className="w-3 h-3" /> {new Date(r.start_time).toLocaleDateString()} - {new Date(r.end_time).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">RESERVED</span>
                                </div>
                            </div>
                        ))}
                        {reservations.length === 0 && (
                            <div className="text-center py-12 border border-dashed border-white/10">
                                <p className="text-[10px] text-white/40 uppercase tracking-widest">No active enterprise reservations</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Modal Form */}
            {showForm && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="w-full max-w-md bg-zinc-900 border border-white/10 shadow-2xl p-8"
                    >
                        <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-6">{editingCampaign ? 'Edit' : 'New'} Campaign</h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-[8px] font-black text-white/60 uppercase tracking-widest mb-1">Campaign Title</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 px-4 py-2 text-xs text-white uppercase tracking-widest focus:border-white/20 outline-none transition-colors"
                                />
                            </div>
                            <div>
                                <label className="block text-[8px] font-black text-white/60 uppercase tracking-widest mb-1">Image URL</label>
                                <input
                                    type="url"
                                    required
                                    value={formData.image_url}
                                    onChange={e => setFormData({ ...formData, image_url: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 px-4 py-2 text-xs text-white focus:border-white/20 outline-none transition-colors"
                                />
                            </div>
                            <div>
                                <label className="block text-[8px] font-black text-white/60 uppercase tracking-widest mb-1">Target URL</label>
                                <input
                                    type="url"
                                    required
                                    value={formData.link_url}
                                    onChange={e => setFormData({ ...formData, link_url: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 px-4 py-2 text-xs text-white focus:border-white/20 outline-none transition-colors"
                                />
                            </div>
                            <div>
                                <label className="block text-[8px] font-black text-white/60 uppercase tracking-widest mb-1">Owner Email</label>
                                <input
                                    type="email"
                                    required
                                    value={formData.owner_email}
                                    onChange={e => setFormData({ ...formData, owner_email: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 px-4 py-2 text-xs text-white font-mono focus:border-white/20 outline-none transition-colors"
                                />
                            </div>
                            <div className="flex items-center gap-4 pt-2">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.is_enterprise}
                                        onChange={e => setFormData({ ...formData, is_enterprise: e.target.checked })}
                                        className="sr-only"
                                    />
                                    <div className={cn(
                                        "w-4 h-4 border flex items-center justify-center transition-all",
                                        formData.is_enterprise ? "bg-amber-500 border-amber-500" : "border-white/20 bg-white/5"
                                    )}>
                                        {formData.is_enterprise && <CheckCircleIcon className="w-3 h-3 text-black" />}
                                    </div>
                                    <span className="text-[10px] font-black text-white uppercase tracking-widest">Enterprise Campaign</span>
                                </label>
                            </div>
                            <div className="flex gap-4 pt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowForm(false)}
                                    className="flex-1 py-3 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-3 bg-white text-black text-[10px] font-black uppercase tracking-widest hover:bg-zinc-200 transition-colors"
                                >
                                    {editingCampaign ? 'Save Changes' : 'Create Campaign'}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
