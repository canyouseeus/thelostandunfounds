import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Image as ImageIcon, DollarSign, Download, AlertCircle, CheckCircle, RefreshCw, Activity, Plus, Lock, Unlock, Trash2, Globe, Upload, X, Cloud, HardDrive, Edit2 } from 'lucide-react';
import { AnimatedNumber } from '@/components/ui/animated-number';
import { useToast } from '@/components/Toast';

interface AdminGalleryViewProps {
    onBack: () => void;
}

interface GalleryStats {
    totalOrders: number;
    totalRevenue: number;
    recentOrders: any[];
}

interface PhotoLibrary {
    id: string;
    name: string;
    slug: string;
    description: string;
    is_private: boolean;
    google_drive_folder_id?: string;
    photo_count?: number;
    cover_image_url?: string;
    price?: number;
    commercial_included?: boolean;
}

interface PricingOption {
    id?: string;
    library_id?: string;
    name: string;
    price: number;
    photo_count: number; // 1 = single, -1 = all, >1 = bundle
    is_active?: boolean;
}

export default function AdminGalleryView({ onBack }: AdminGalleryViewProps) {
    const [stats, setStats] = useState<GalleryStats | null>(null);
    const [libraries, setLibraries] = useState<PhotoLibrary[]>([]);
    const [loading, setLoading] = useState(true);
    const [verifying, setVerifying] = useState(false);
    const [healthStatus, setHealthStatus] = useState<'unknown' | 'healthy' | 'issues'>('unknown');

    // Create Gallery State
    // Create/Edit Gallery State
    const [isManaged, setIsManaged] = useState(false); // Modal open state
    const [editingId, setEditingId] = useState<string | null>(null); // If set, we are editing
    const [uploadMode, setUploadMode] = useState<'drive' | 'upload'>('drive');
    const [filesData, setFilesData] = useState<{ file: File; thumbnail?: Blob; previewUrl: string }[]>([]);
    const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
    const [uploadProgress, setUploadProgress] = useState(0);

    const [modalData, setModalData] = useState<Partial<PhotoLibrary>>({
        is_private: false,
        price: 5.00,
        commercial_included: false,
    });
    const [pricingOptions, setPricingOptions] = useState<PricingOption[]>([]);
    const [editingPricingIdx, setEditingPricingIdx] = useState<number | null>(null);
    const [deletedPricingIds, setDeletedPricingIds] = useState<string[]>([]);

    const { success, error, info } = useToast();

    useEffect(() => {
        loadGalleryStats();
    }, []);

    const loadGalleryStats = async () => {
        try {
            setLoading(true);
            // Get orders
            const { data: orders, error: supabaseError } = await supabase
                .from('photo_orders')
                .select('*')
                .order('created_at', { ascending: false });

            if (supabaseError) throw supabaseError;

            // Get libraries with photo counts
            const { data: libs, error: libError } = await supabase
                .from('photo_libraries')
                .select('*, photos(count)')
                .order('created_at', { ascending: false });

            if (libError) throw libError;

            // Process libraries to flatten photo_count
            const processedLibs = libs?.map(lib => ({
                ...lib,
                photo_count: lib.photos?.[0]?.count || 0
            })) || [];

            setLibraries(processedLibs);

            // Calculate stats
            const totalRevenue = orders?.reduce((sum, order) => sum + (order.total_amount_cents || 0), 0) / 100 || 0;

            setStats({
                totalOrders: orders?.length || 0,
                totalRevenue,
                recentOrders: orders?.slice(0, 10) || []
            });
        } catch (err) {
            console.error('Error loading gallery stats:', err);
            error('Failed to load gallery data');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveGallery = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            let finalLibrary: PhotoLibrary | null = null;

            const libraryData = {
                name: modalData.name,
                slug: modalData.slug || (modalData.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-') || ''),
                description: modalData.description || '',
                is_private: modalData.is_private || false,
                commercial_included: modalData.commercial_included || false,
                google_drive_folder_id: uploadMode === 'drive' ? (modalData.google_drive_folder_id || null) : null,
                cover_image_url: modalData.cover_image_url || null,
                price: modalData.price || 5.00
            };

            if (editingId) {
                // Update Existing
                const { data, error: updateError } = await supabase
                    .from('photo_libraries')
                    .update(libraryData)
                    .eq('id', editingId)
                    .select()
                    .single();

                if (updateError) throw updateError;
                finalLibrary = data;
            } else {
                // Create New
                const { data, error: createError } = await supabase
                    .from('photo_libraries')
                    .insert([libraryData])
                    .select()
                    .single();

                if (createError) throw createError;
                finalLibrary = data;
            }

            if (!finalLibrary) throw new Error('Failed to save library');

            // 2. Handle File Uploads (Only if new files added)
            // Note: If editing, this ADDS to the library. It doesn't replace.
            if (uploadMode === 'upload' && filesData.length > 0 && finalLibrary) {
                let completed = 0;
                setUploadProgress(0);

                for (const item of filesData) {
                    const { file, thumbnail } = item;
                    const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
                    const filePath = `${finalLibrary.id}/${cleanName}`;
                    let thumbUrl = '';

                    // a. Upload Main File
                    const { error: uploadError } = await supabase.storage
                        .from('gallery-photos')
                        .upload(filePath, file);

                    if (uploadError) {
                        console.error(`Failed to upload ${file.name}`, uploadError);
                        continue;
                    }

                    const { data: { publicUrl: fileUrl } } = supabase.storage
                        .from('gallery-photos')
                        .getPublicUrl(filePath);

                    // b. Handle Thumbnail
                    if (file.type.startsWith('video/') && thumbnail) {
                        const thumbPath = `${finalLibrary.id}/t_${cleanName}.jpg`;
                        await supabase.storage
                            .from('gallery-photos')
                            .upload(thumbPath, thumbnail);

                        const { data: { publicUrl } } = supabase.storage
                            .from('gallery-photos')
                            .getPublicUrl(thumbPath);
                        thumbUrl = publicUrl;
                    } else {
                        thumbUrl = fileUrl; // For images, thumbnail is the image itself (or we could resize server-side later)
                    }

                    // c. Create Photo Record
                    await supabase.from('photos').insert({
                        library_id: finalLibrary.id,
                        title: file.name.split('.')[0],
                        storage_path: filePath,
                        thumbnail_url: thumbUrl,
                        mime_type: file.type,
                        status: 'active'
                    });

                    completed++;
                    setUploadProgress((completed / filesData.length) * 100);
                }
            }

            // 5. Manage Pricing Options
            const libraryId = finalLibrary.id;

            // Handle Deletions
            if (deletedPricingIds.length > 0) {
                await supabase
                    .from('gallery_pricing_options')
                    .delete()
                    .in('id', deletedPricingIds);
            }

            // Handle Upserts
            for (const option of pricingOptions) {
                const payload = {
                    library_id: libraryId,
                    name: option.name,
                    price: option.price,
                    photo_count: option.photo_count,
                    is_active: true
                };

                if (option.id) {
                    await supabase
                        .from('gallery_pricing_options')
                        .update(payload)
                        .eq('id', option.id);
                } else {
                    await supabase
                        .from('gallery_pricing_options')
                        .insert(payload);
                }
            }

            success(editingId ? 'Gallery updated successfully' : 'Gallery created successfully');
            setIsManaged(false);
            loadGalleryStats();
        } catch (err: any) {
            console.error('Error saving gallery:', err);
            error(err.message || 'Failed to save gallery');
        } finally {
            setLoading(false);
        }
    };

    const generateVideoThumbnail = (file: File): Promise<Blob | null> => {
        return new Promise((resolve) => {
            const video = document.createElement('video');
            video.preload = 'metadata';
            video.src = URL.createObjectURL(file);
            video.muted = true;
            video.playsInline = true;
            video.currentTime = 1; // Capture at 1s

            video.onloadeddata = () => {
                // Ensure we have data
                if (video.readyState >= 2) {
                    video.currentTime = 1;
                }
            };

            video.onseeked = () => {
                const canvas = document.createElement('canvas');
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
                canvas.toBlob((blob) => {
                    URL.revokeObjectURL(video.src);
                    resolve(blob);
                }, 'image/jpeg', 0.8);
            };

            video.onerror = () => {
                URL.revokeObjectURL(video.src);
                resolve(null);
            };
        });
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const selectedFiles = Array.from(e.target.files);
            const processedFiles = await Promise.all(selectedFiles.map(async (file) => {
                let thumbnail: Blob | undefined;
                let previewUrl = URL.createObjectURL(file);

                if (file.type.startsWith('video/')) {
                    const thumbBlob = await generateVideoThumbnail(file);
                    if (thumbBlob) {
                        thumbnail = thumbBlob;
                        previewUrl = URL.createObjectURL(thumbBlob);
                    }
                }

                return { file, thumbnail, previewUrl };
            }));

            setFilesData(prev => [...prev, ...processedFiles]);
        }
    };

    const removeFile = (index: number) => {
        setFilesData(prev => {
            const newFiles = [...prev];
            URL.revokeObjectURL(newFiles[index].previewUrl); // Cleanup
            newFiles.splice(index, 1);
            return newFiles;
        });
    };

    const handleDeleteGallery = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to delete gallery "${name}"? This cannot be undone.`)) return;

        try {
            const { error: delError } = await supabase
                .from('photo_libraries')
                .delete()
                .eq('id', id);

            if (delError) throw delError;

            success('Gallery deleted');
            loadGalleryStats();
        } catch (err) {
            error('Failed to delete gallery');
        }
    };

    const openEditModal = async (lib: PhotoLibrary) => {
        setEditingId(lib.id);
        setModalData({
            ...lib,
            price: lib.price ?? 5.00,
            commercial_included: lib.commercial_included ?? false,
        });
        setFilesData([]);
        setCoverImageFile(null);
        setUploadMode(lib.google_drive_folder_id ? 'drive' : 'upload');

        // Fetch pricing options
        const { data: pricing } = await supabase
            .from('gallery_pricing_options')
            .select('*')
            .eq('library_id', lib.id)
            .order('photo_count', { ascending: true }); // -1 (All) usually comes first if sorted numerically, wait. -1 is small. We want logic sort later.

        if (pricing && pricing.length > 0) {
            setPricingOptions(pricing);
        } else {
            // Determine implicit defaults if none exist
            setPricingOptions([
                { name: 'Single Photo', price: lib.price || 5.00, photo_count: 1 }
            ]);
        }
        setDeletedPricingIds([]);
        setIsManaged(true);
    };

    const openCreateModal = () => {
        setEditingId(null);
        setModalData({
            name: '',
            slug: '',
            description: '',
            is_private: false,
            google_drive_folder_id: '',
            cover_image_url: '',
            price: 5.00,
            commercial_included: false,
        });
        setFilesData([]);
        setIsManaged(true);
    };

    const handleCoverImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];

        // Optimize: Upload to a 'covers' folder or generally in gallery-photos
        const filePath = `covers/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

        try {
            const { error: uploadError } = await supabase.storage
                .from('gallery-photos')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('gallery-photos')
                .getPublicUrl(filePath);

            setModalData(prev => ({ ...prev, cover_image_url: publicUrl }));
            success('Cover image uploaded');
        } catch (err) {
            console.error(err);
            error('Failed to upload cover image');
        }
    };

    const checkAssetHealth = async () => {
        setVerifying(true);
        try {
            info('Starting asset health check...');

            // First, try to get an actual photo from the database
            const { data: photos, error: photoError } = await supabase
                .from('photos')
                .select('google_drive_file_id')
                .not('google_drive_file_id', 'is', null)
                .limit(1);

            if (photoError) {
                console.error('Error fetching photos for health check:', photoError);
                setHealthStatus('issues');
                error('Failed to query photos database');
                return;
            }

            if (!photos || photos.length === 0) {
                setHealthStatus('unknown');
                info('No photos in database yet. Upload photos to test asset delivery.');
                return;
            }

            const testFileId = photos[0].google_drive_file_id;
            const res = await fetch(`/api/gallery/stream?fileId=${testFileId}`);

            if (res.ok) {
                setHealthStatus('healthy');
                success('Gallery Asset System is HEALTHY. Public access verified.');
            } else {
                setHealthStatus('issues');
                if (res.status === 403) {
                    error('CRITICAL: Google Drive Permissions Error (403). Files must be set to "Anyone with link can view"');
                } else if (res.status === 404) {
                    error('File not found (404). The Google Drive file may have been deleted or moved.');
                } else {
                    error(`System Error: ${res.status}. Check server logs for details.`);
                }
            }

        } catch (err) {
            console.error('Health check error:', err);
            setHealthStatus('issues');
            error('Failed to verify asset health. Check network connection and API endpoints.');
        } finally {
            setVerifying(false);
        }
    };

    const triggerResend = async (orderId: string, email: string) => {
        if (!confirm(`Resend download email to ${email}?`)) return;

        try {
            const res = await fetch('/api/gallery/resend-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId, email })
            });

            if (!res.ok) throw new Error('Failed to send');

            success('Email sent successfully');
        } catch (err) {
            error('Failed to send email');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <button onClick={onBack} className="flex items-center gap-2 text-white/60 hover:text-white mb-2 transition-colors">
                    <ArrowLeft className="w-4 h-4" />
                    Back to Dashboard
                </button>
                <div className="flex gap-2">
                    <button
                        onClick={checkAssetHealth}
                        disabled={verifying}
                        className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 text-xs uppercase tracking-wider font-bold flex items-center gap-2"
                    >
                        {verifying ? (
                            <>
                                <RefreshCw className="w-3 h-3 animate-spin" /> Check Connectivity
                            </>
                        ) : (
                            <>
                                <Activity className="w-3 h-3" /> Test Connection
                            </>
                        )}
                    </button>
                    <button
                        onClick={openCreateModal}
                        className="px-4 py-2 bg-white text-black text-xs uppercase tracking-wider font-bold flex items-center gap-2 hover:bg-white/90"
                    >
                        <Plus className="w-4 h-4" /> New Gallery
                    </button>
                </div>
            </div>

            {/* Create/Edit Gallery Modal */}
            {isManaged && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
                    <div className="bg-[#0A0A0A] border border-white/10 w-full max-w-2xl p-6 relative my-8 max-h-[calc(100vh-4rem)] overflow-y-auto custom-scrollbar">
                        <button
                            onClick={() => setIsManaged(false)}
                            className="absolute top-4 right-4 text-white/40 hover:text-white"
                        >
                            <Plus className="w-6 h-6 rotate-45" />
                        </button>

                        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                            {editingId ? <Edit2 className="w-5 h-5 text-white/60" /> : <Plus className="w-5 h-5 text-white/60" />}
                            {editingId ? 'Edit Gallery Settings' : 'Create New Gallery'}
                        </h2>

                        <form onSubmit={handleSaveGallery} className="space-y-6">
                            {/* Gallery Name & Slug */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs uppercase text-white/40 mb-1">Gallery Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={modalData.name}
                                        onChange={(e) => {
                                            const name = e.target.value;
                                            if (!editingId) {
                                                const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
                                                setModalData({ ...modalData, name, slug });
                                            } else {
                                                setModalData({ ...modalData, name });
                                            }
                                        }}
                                        className="w-full bg-white/5 border border-white/10 p-2 text-white placeholder-white/20 focus:outline-none focus:border-white/40"
                                        placeholder="e.g. Summer 2025 Collection"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs uppercase text-white/40 mb-1">URL Slug</label>
                                    <div className="flex items-center gap-2 bg-white/5 border border-white/10 p-2 opacity-50">
                                        <span className="text-white/40 text-xs">/gallery/</span>
                                        <input
                                            type="text"
                                            required
                                            value={modalData.slug}
                                            onChange={(e) => setModalData({ ...modalData, slug: e.target.value })}
                                            className="bg-transparent text-white w-full focus:outline-none font-mono text-sm"
                                            placeholder="summer-2025"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Pricing Options - Full Width */}
                            <div>
                                <label className="block text-xs uppercase text-white/40 mb-2">Pricing Options & Bundles</label>
                                <div className="space-y-2 mb-3">
                                    {pricingOptions.map((option, idx) => {
                                        const isEditing = editingPricingIdx === idx;
                                        return (
                                            <div
                                                key={idx}
                                                className="grid items-center gap-3 bg-white/5 border border-white/10 p-3"
                                                style={{ gridTemplateColumns: '1fr 100px 120px auto' }}
                                            >
                                                {isEditing ? (
                                                    <>
                                                        {/* Name Input */}
                                                        <div>
                                                            <input
                                                                type="text"
                                                                value={option.name}
                                                                onChange={(e) => {
                                                                    const newOptions = [...pricingOptions];
                                                                    newOptions[idx].name = e.target.value;
                                                                    setPricingOptions(newOptions);
                                                                }}
                                                                placeholder="Option Name"
                                                                className="w-full bg-transparent text-sm text-white focus:outline-none border-b border-white/20 pb-1"
                                                                autoFocus
                                                            />
                                                        </div>
                                                        {/* Count Input */}
                                                        <div className="text-center">
                                                            <input
                                                                type="number"
                                                                value={option.photo_count}
                                                                onChange={(e) => {
                                                                    const newOptions = [...pricingOptions];
                                                                    const val = parseInt(e.target.value);
                                                                    newOptions[idx].photo_count = isNaN(val) ? 0 : val;
                                                                    setPricingOptions(newOptions);
                                                                }}
                                                                placeholder="Count"
                                                                title="Number of photos (-1 for All)"
                                                                className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-center text-white font-mono focus:outline-none focus:border-white/40 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                            />
                                                        </div>
                                                        {/* Price Input */}
                                                        <div className="flex items-center justify-center gap-1">
                                                            <span className="text-xs text-white/40">$</span>
                                                            <input
                                                                type="number"
                                                                step="0.01"
                                                                value={option.price}
                                                                onChange={(e) => {
                                                                    const newOptions = [...pricingOptions];
                                                                    const val = parseFloat(e.target.value);
                                                                    newOptions[idx].price = isNaN(val) ? 0 : val;
                                                                    setPricingOptions(newOptions);
                                                                }}
                                                                className="w-20 bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white font-bold font-mono focus:outline-none focus:border-white/40 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                            />
                                                        </div>
                                                        {/* Done Button */}
                                                        <div className="flex justify-end">
                                                            <button
                                                                type="button"
                                                                onClick={() => setEditingPricingIdx(null)}
                                                                className="p-1.5 hover:bg-green-500/20 text-green-400 rounded-sm transition-colors"
                                                                title="Done"
                                                            >
                                                                <CheckCircle className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <>
                                                        {/* Name Display */}
                                                        <div className="text-sm font-bold text-white truncate">
                                                            {option.name || <span className="text-white/20 italic">No Name</span>}
                                                        </div>
                                                        {/* Count Display */}
                                                        <div className="text-center border-l border-white/10 pl-3">
                                                            <div className="flex items-center justify-center gap-1">
                                                                <span className="text-[10px] text-white/40">Count:</span>
                                                                <span className="text-xs font-mono text-white/80">{option.photo_count === -1 ? 'ALL' : option.photo_count}</span>
                                                            </div>
                                                        </div>
                                                        {/* Price Display */}
                                                        <div className="text-center border-l border-white/10 pl-3">
                                                            <div className="flex items-center justify-center gap-1">
                                                                <span className="text-xs text-white/40">$</span>
                                                                <span className="text-sm font-bold font-mono text-green-400">{option.price.toFixed(2)}</span>
                                                            </div>
                                                        </div>
                                                        {/* Action Buttons */}
                                                        <div className="flex gap-1 justify-end">
                                                            <button
                                                                type="button"
                                                                onClick={() => setEditingPricingIdx(idx)}
                                                                className="p-1.5 hover:bg-white/10 text-white/40 hover:text-white rounded-sm transition-colors"
                                                                title="Edit"
                                                            >
                                                                <Edit2 className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const newOptions = pricingOptions.filter((_, i) => i !== idx);
                                                                    if (option.id) {
                                                                        setDeletedPricingIds([...deletedPricingIds, option.id]);
                                                                    }
                                                                    setPricingOptions(newOptions);
                                                                    if (editingPricingIdx === idx) setEditingPricingIdx(null);
                                                                }}
                                                                className="p-1.5 hover:bg-red-500/20 text-white/20 hover:text-red-400 rounded-sm transition-colors"
                                                                title="Remove"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setPricingOptions([...pricingOptions, { id: '', name: 'Bundle Option', photo_count: 3, price: 10.00 }])}
                                        className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-[10px] text-white rounded transition-colors uppercase tracking-wider"
                                    >
                                        + Add Option
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPricingOptions([...pricingOptions, { id: '', name: 'Full Gallery Commercial License', photo_count: -1, price: 999.00 }])}
                                        className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-[10px] text-emerald-400 border border-emerald-500/50 rounded transition-colors uppercase tracking-wider"
                                    >
                                        + Add Full License
                                    </button>
                                </div>
                                <p className="text-[10px] text-white/30 mt-2">
                                    Use count "-1" for Full Gallery Buyout options. Name options with "Commercial" to trigger commercial licensing checkout flow.
                                </p>
                            </div>

                            <div>
                                <label className="block text-xs uppercase text-white/40 mb-1">Description</label>
                                <textarea
                                    value={modalData.description}
                                    onChange={(e) => setModalData({ ...modalData, description: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 p-2 text-white placeholder-white/20 focus:outline-none focus:border-white/40 min-h-[80px]"
                                    placeholder="Brief description of the gallery contents..."
                                />
                            </div>

                            <div>
                                <label className="block text-xs uppercase text-white/40 mb-2">Cover Image</label>
                                <div className="flex items-start gap-4">
                                    {modalData.cover_image_url && (
                                        <div className="w-24 h-16 bg-zinc-800 rounded overflow-hidden flex-shrink-0 border border-white/10">
                                            <img src={modalData.cover_image_url} alt="Cover" className="w-full h-full object-cover" />
                                        </div>
                                    )}
                                    <div className="flex-1 space-y-2">
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={modalData.cover_image_url}
                                                onChange={(e) => setModalData({ ...modalData, cover_image_url: e.target.value })}
                                                className="flex-1 bg-white/5 border border-white/10 p-2 text-xs text-white"
                                                placeholder="https://... (or upload below)"
                                            />
                                        </div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <input
                                                type="checkbox"
                                                checked={modalData.is_private}
                                                onChange={(e) => setModalData({ ...modalData, is_private: e.target.checked })}
                                                className="w-4 h-4 bg-white/5 border border-white/20 rounded focus:ring-0 text-white"
                                            />
                                            <span className="text-white text-xs uppercase tracking-widest">Private Gallery</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                checked={modalData.commercial_included}
                                                onChange={(e) => setModalData({ ...modalData, commercial_included: e.target.checked })}
                                                className="w-4 h-4 bg-white/5 border border-white/20 rounded focus:ring-0 text-emerald-500"
                                            />
                                            <span className="text-emerald-400 text-xs uppercase tracking-widest font-bold">Commercial Rights Included</span>
                                        </div>
                                        <p className="text-[10px] text-white/30 mt-1 pl-6">
                                            If checked, displays "Eligible for Commercial Use" and assumes license is granted.
                                        </p>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleCoverImageUpload}
                                            className="block w-full text-xs text-white/60
                                               file:mr-4 file:py-2 file:px-4
                                               file:rounded-full file:border-0
                                               file:text-xs file:font-semibold
                                               file:bg-white/10 file:text-white
                                               hover:file:bg-white/20"
                                        />
                                    </div>
                                </div>
                            </div>

                            <hr className="border-white/10" />

                            <div>
                                <label className="block text-xs uppercase text-white/40 mb-3">Asset Source</label>
                                <div className="flex gap-2 mb-4">
                                    <button
                                        type="button"
                                        onClick={() => setUploadMode('drive')}
                                        className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs uppercase font-bold border ${uploadMode === 'drive' ? 'bg-white text-black border-white' : 'bg-transparent text-white/40 border-white/20 hover:text-white hover:border-white/40'}`}
                                    >
                                        <Cloud className="w-4 h-4" /> {editingId ? 'Update Drive Folder' : 'Link Google Drive'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setUploadMode('upload')}
                                        className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs uppercase font-bold border ${uploadMode === 'upload' ? 'bg-white text-black border-white' : 'bg-transparent text-white/40 border-white/20 hover:text-white hover:border-white/40'}`}
                                    >
                                        <Upload className="w-4 h-4" /> {editingId ? 'Add More Photos' : 'Direct Upload'}
                                    </button>
                                </div>

                                {uploadMode === 'drive' ? (
                                    <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                                        <label className="block text-xs uppercase text-white/40 mb-1">Google Drive Folder ID</label>
                                        <input
                                            type="text"
                                            value={modalData.google_drive_folder_id}
                                            onChange={(e) => setModalData({ ...modalData, google_drive_folder_id: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 p-2 text-white placeholder-white/20 focus:outline-none focus:border-white/40 font-mono text-xs"
                                            placeholder="1AbCdEfGhIjK..."
                                            required={uploadMode === 'drive' && !filesData.length} // Only required if not uploading files in mixed mode (simplified logic)
                                        />
                                        <p className="text-[10px] text-white/40 mt-1 flex items-center gap-1">
                                            <AlertCircle className="w-3 h-3" />
                                            Folder must be set to "Anyone with link can view"
                                        </p>
                                    </div>
                                ) : (
                                    <div className="animate-in fade-in slide-in-from-top-2 duration-200 space-y-3">
                                        <div className="border border-dashed border-white/20 bg-white/5 p-6 text-center hover:bg-white/10 transition-colors relative">
                                            <input
                                                type="file"
                                                multiple
                                                accept="image/*,video/*"
                                                onChange={handleFileSelect}
                                                className="absolute inset-0 opacity-0 cursor-pointer"
                                            />
                                            <div className="pointer-events-none">
                                                <Upload className="w-6 h-6 text-white/40 mx-auto mb-2" />
                                                <p className="text-white text-xs uppercase font-bold">Click or Drag Photos Here</p>
                                                <p className="text-white/40 text-[10px] mt-1">{filesData.length} files selected</p>
                                            </div>
                                        </div>

                                        {filesData.length > 0 && (
                                            <div className="max-h-[220px] overflow-y-auto border border-white/10 bg-black/40 p-2 grid grid-cols-2 gap-2 custom-scrollbar">
                                                {filesData.map((item, i) => (
                                                    <div key={i} className="flex items-center gap-2 overflow-hidden text-xs text-white bg-white/5 p-2 rounded-sm relative group">
                                                        <div className="w-10 h-10 flex-shrink-0 bg-black/50 overflow-hidden relative">
                                                            {item.file.type.startsWith('video/') && (
                                                                <div className="absolute inset-0 flex items-center justify-center z-10">
                                                                    <div className="w-4 h-4 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                                                        <div className="w-0 h-0 border-l-[4px] border-l-white border-y-[3px] border-y-transparent ml-0.5" />
                                                                    </div>
                                                                </div>
                                                            )}
                                                            <img src={item.previewUrl} className="w-full h-full object-cover" alt="" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="truncate text-[10px]">{item.file.name}</p>
                                                            <p className="text-[9px] text-white/40 uppercase">{Math.round(item.file.size / 1024)} KB</p>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => removeFile(i)}
                                                            className="absolute top-1 right-1 p-1 bg-black/50 text-white/40 hover:text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                                        >
                                                            <X className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {uploadProgress > 0 && (
                                            <div>
                                                <div className="flex justify-between text-[10px] text-white/60 mb-1">
                                                    <span>Uploading...</span>
                                                    <span>{Math.round(uploadProgress)}%</span>
                                                </div>
                                                <div className="h-1 bg-white/10 w-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-white transition-all duration-300 ease-out"
                                                        style={{ width: `${uploadProgress}%` }}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsManaged(false)}
                                    className="flex-1 py-3 border border-white/10 text-white/60 hover:text-white hover:bg-white/5 transition uppercase text-xs font-bold"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-3 bg-white text-black hover:bg-white/90 transition uppercase text-xs font-bold"
                                >
                                    {editingId ? 'Save Gallery' : 'Create Gallery'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="bg-black/50 border border-white/10 rounded-none p-6">
                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <ImageIcon className="w-5 h-5" />
                    GALLERY OPERATIONS
                </h2>

                {/* Health Check Status Banner */}
                {healthStatus === 'issues' && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 text-red-500 flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        <div>
                            <p className="font-bold uppercase text-sm">System Alert: Asset Delivery Issue Detected</p>
                            <p className="text-xs opacity-80 mt-1">Google Drive files may not be public. Users cannot download. Please check 'gallery-ops' skill.</p>
                        </div>
                    </div>
                )}

                {healthStatus === 'healthy' && (
                    <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 text-green-500 flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 flex-shrink-0" />
                        <div>
                            <p className="font-bold uppercase text-sm">System Healthy</p>
                            <p className="text-xs opacity-80 mt-1">Asset delivery system is fully operational.</p>
                        </div>
                    </div>
                )}

                {/* Key Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                    <div className="bg-white/5 border border-white/10 p-4 rounded-none">
                        <div className="flex items-center gap-2 mb-2 text-white/60 text-xs uppercase tracking-wider">
                            <Download className="w-3 h-3" /> Total Orders
                        </div>
                        <div className="text-3xl font-bold text-white">
                            <AnimatedNumber value={stats?.totalOrders || 0} />
                        </div>
                    </div>

                    <div className="bg-white/5 border border-white/10 p-4 rounded-none">
                        <div className="flex items-center gap-2 mb-2 text-white/60 text-xs uppercase tracking-wider">
                            <DollarSign className="w-3 h-3" /> Total Sales
                        </div>
                        <div className="text-3xl font-bold text-green-400">
                            $<AnimatedNumber value={stats?.totalRevenue || 0} />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Active Galleries */}
                    <div className="border border-white/10 bg-white/[0.02] p-6 rounded-none h-full">
                        <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-2">
                            <h3 className="text-sm font-bold text-white uppercase tracking-wide">
                                Active Galleries ({libraries.length})
                            </h3>
                            <button onClick={loadGalleryStats} className="text-white/40 hover:text-white">
                                <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                            </button>
                        </div>

                        {loading && libraries.length === 0 ? (
                            <div className="text-white/40 text-sm py-4">Loading galleries...</div>
                        ) : (
                            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                {libraries.length === 0 ? (
                                    <div className="text-white/40 text-sm py-4">No galleries found.</div>
                                ) : (
                                    libraries.map((lib) => (
                                        <div key={lib.id} className="group flex items-start justify-between p-3 bg-white/5 hover:bg-white/10 transition-colors border border-transparent hover:border-white/10">
                                            <div
                                                className="flex-1 min-w-0 mr-4 cursor-pointer"
                                                onClick={() => openEditModal(lib)}
                                            >
                                                <div className="flex items-center gap-2 mb-1">
                                                    {lib.is_private ? (
                                                        <Lock className="w-3 h-3 text-yellow-400 flex-shrink-0" />
                                                    ) : (
                                                        <Globe className="w-3 h-3 text-green-400 flex-shrink-0" />
                                                    )}
                                                    <h4 className="font-bold text-white text-sm truncate">{lib.name}</h4>
                                                </div>
                                                <div className="flex items-center gap-2 text-xs text-white/40 font-mono">
                                                    <span>/{lib.slug}</span>
                                                    <span>•</span>
                                                    <span>{lib.photo_count || 0} photos</span>
                                                </div>
                                            </div>
                                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <a
                                                    href={`/gallery/${lib.slug}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="p-2 hover:bg-white/20 text-white/60 hover:text-white rounded-sm"
                                                    title="View Gallery"
                                                >
                                                    <ArrowLeft className="w-4 h-4 rotate-180" />
                                                </a>
                                                <button
                                                    onClick={() => handleDeleteGallery(lib.id, lib.name)}
                                                    className="p-2 hover:bg-red-500/20 text-white/60 hover:text-red-400 rounded-sm"
                                                    title="Delete Gallery"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>

                    {/* Recent Orders List */}
                    <div className="border border-white/10 bg-white/[0.02] p-6 rounded-none h-full">
                        <h3 className="text-sm font-bold text-white uppercase mb-4 tracking-wide border-b border-white/10 pb-2">
                            Recent Sales
                        </h3>

                        {loading && !stats ? (
                            <div className="text-white/40 text-sm py-4">Loading orders...</div>
                        ) : (
                            <div className="space-y-1 max-h-[400px] overflow-y-auto custom-scrollbar">
                                {stats?.recentOrders.length === 0 ? (
                                    <div className="text-white/40 text-sm py-4">No orders found.</div>
                                ) : (
                                    stats?.recentOrders.map((order) => (
                                        <div key={order.id} className="flex flex-col md:flex-row md:items-center justify-between p-3 bg-white/5 hover:bg-white/10 transition-colors border-b border-white/5 last:border-0 gap-3">
                                            <div>
                                                <div className="text-white font-mono text-sm">{order.email}</div>
                                                <div className="text-white/40 text-xs flex items-center gap-2">
                                                    <span>{(order.total_amount_cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</span>
                                                    <span>•</span>
                                                    <span>{new Date(order.created_at).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => triggerResend(order.paypal_order_id, order.email)}
                                                    className="text-xs uppercase font-bold text-white/60 hover:text-white px-3 py-1 border border-white/20 hover:bg-white/10 transition"
                                                >
                                                    Resend Email
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
