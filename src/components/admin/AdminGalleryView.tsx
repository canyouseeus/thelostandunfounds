import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { ArrowLeftIcon, PhotoIcon, CurrencyDollarIcon, ArrowDownTrayIcon, ExclamationCircleIcon, CheckCircleIcon, ArrowPathIcon, ChartBarIcon, PlusIcon, LockClosedIcon, LockOpenIcon, TrashIcon, GlobeAltIcon, ArrowUpTrayIcon, XMarkIcon, CloudIcon, CircleStackIcon, PencilIcon, EnvelopeIcon } from '@heroicons/react/24/outline';
import { AnimatedNumber } from '@/components/ui/animated-number';
import { useToast } from '@/components/Toast';
import { useAuth } from '@/contexts/AuthContext';
import { GalleryCountdownOverlay, shouldShowCountdown } from '@/components/ui/gallery-countdown-overlay';
import { isAdminEmail } from '@/utils/admin';

interface AdminGalleryViewProps {
    onBack: () => void;
    isPhotographerView?: boolean;
}

interface GalleryStats {
    totalOrders: number;
    totalRevenue: number;
    recentOrders: any[];
    recentPhotos: any[];
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
    owner_id?: string;
    invited_emails?: string; // Comma-separated list of invited client emails
}

interface PricingOption {
    id?: string;
    library_id?: string;
    name: string;
    price: number;
    photo_count: number; // 1 = single, -1 = all, >1 = bundle
    is_active?: boolean;
}

export default function AdminGalleryView({ onBack, isPhotographerView = false }: AdminGalleryViewProps) {
    const { user } = useAuth(); // Get authenticated user
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
    const [activeTab, setActiveTab] = useState<'galleries' | 'applications'>('galleries');
    const [applications, setApplications] = useState<any[]>([]);
    const [appsLoading, setAppsLoading] = useState(false);
    const [pendingAppsCount, setPendingAppsCount] = useState(0);

    const [modalData, setModalData] = useState<Partial<PhotoLibrary>>({
        is_private: false,
        price: 5.00,
        commercial_included: false,
    });
    const [pricingOptions, setPricingOptions] = useState<PricingOption[]>([]);
    const [editingPricingIdx, setEditingPricingIdx] = useState<number | null>(null);
    const [deletedPricingIds, setDeletedPricingIds] = useState<string[]>([]);
    const [invitedEmails, setInvitedEmails] = useState<string[]>([]); // Persistent list of invited emails
    const [originalInvitedEmails, setOriginalInvitedEmails] = useState<string[]>([]); // Track original emails to detect new ones
    const [newEmailInput, setNewEmailInput] = useState(''); // Input for adding new emails

    // Photographer Invite State
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [inviteData, setInviteData] = useState({ email: '', name: '' });
    const [inviteLoading, setInviteLoading] = useState(false);

    // Countdown overlay state for "LAST NIGHT" gallery
    const [countdownExpired, setCountdownExpired] = useState(false);
    const targetTime8PM = useMemo(() => {
        const target = new Date();
        target.setHours(11, 11, 0, 0); // 11:11 AM today
        return target;
    }, []);

    const { success, error, info } = useToast();

    useEffect(() => {
        if (user) {
            loadGalleryStats();
            loadApplications();
        }
    }, [user]);

    const loadApplications = async () => {
        try {
            setAppsLoading(true);
            const { data, error } = await supabase
                .from('photographer_applications')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setApplications(data || []);
            setPendingAppsCount(data?.filter(a => a.status === 'pending').length || 0);
        } catch (err) {
            console.error('Error loading applications:', err);
        } finally {
            setAppsLoading(false);
        }
    };

    const loadGalleryStats = async () => {
        try {
            setLoading(true);

            // 1. Get libraries (filtered by owner if photographer mode)
            let query = supabase
                .from('photo_libraries')
                .select('*, photos(count)')
                .order('created_at', { ascending: false });

            if (isPhotographerView && user && !isAdminEmail(user.email || '')) {
                query = query.eq('owner_id', user.id);
            }

            const { data: libs, error: libError } = await query;

            if (libError) throw libError;

            console.log('[loadGalleryStats] Raw libs from Supabase:', libs?.map(l => ({
                name: l.name,
                photos: l.photos,
                rawCount: l.photos?.[0]?.count
            })));

            // Process libraries to flatten photo_count
            const processedLibs = libs?.map(lib => ({
                ...lib,
                photo_count: lib.photos?.[0]?.count || 0
            })) || [];

            console.log('[loadGalleryStats] Processed libs photo counts:', processedLibs.map(l => ({
                name: l.name,
                photo_count: l.photo_count
            })));

            setLibraries(processedLibs);

            // 2. Get orders (related to these libraries)
            // If photographer, we only want orders for THEIR libraries
            // We can fetch orders where library_id is in the list of fetched libraries
            const libraryIds = processedLibs.map(l => l.id);

            let ordersQuery = supabase
                .from('photo_orders')
                .select('*')
                .order('created_at', { ascending: false });

            // If we have libraries, filter orders by them. 
            // If no libraries, no orders relevant for this view (or user has 0 galleries)
            if (isPhotographerView) {
                if (libraryIds.length > 0) {
                    // Note: photo_orders usually has items JSON, not direct library_id column unless added.
                    // Checking schema... typically order items link to photos/libraries. 
                    // Assuming 'photo_orders' doesn't strictly link to library_id at root. 
                    // BUT for stats, we might fallback to general revenue if schema is complex.
                    // Let's assume for now we just show 0 if specialized filtering is too complex without a join table.
                    // Actually, let's skip order filtering complexity for MVP and just show 0 or "contact admin" for revenue if strict.
                    // OR, if 'photo_orders' has 'items' which contains 'library_id'.
                    // For now, let's safely NOT show all platform orders to a photographer.
                    // We'll fetch orders but maybe filter client-side if needed, or better:
                    // ONLY fetch if we can link it.
                    // Use a simple heuristic: if photographer view, don't show platform-wide stats.
                }
            }

            const { data: orders, error: supabaseError } = await ordersQuery;

            // Filter orders for photographer view (simple client-side check if possible, or just hide stats UI)
            // Since we can't easily join on JSONB items without complex query, 
            // let's just use the fetched orders for GLOBAL admin, and EMPTY/Filtered for photographer.

            // Filter out Sandbox data
            const isTestEmail = (email: string | null | undefined) => {
                if (!email) return false;
                const testPatterns = ['test', 'demo', 'admin', 'dev', 'staging', 'dummy'];
                return testPatterns.some(pattern => email.toLowerCase().includes(pattern));
            };

            let validOrders = (orders || []).filter(o =>
                o.payment_status === 'completed' &&
                !isTestEmail(o.email) &&
                (o.metadata as any)?.environment !== 'sandbox'
            );
            if (isPhotographerView) {
                // If we can't filter easily, show empty to avoid leaking other's data
                // TODO: Implement proper order-to-owner tracking
                validOrders = [];
            }

            // 3. Get Recent Photos (Sorted by updated_at for real-time dashboard updates)
            const { data: recentPhotos, error: photosError } = await supabase
                .from('photos')
                .select('*')
                .order('updated_at', { ascending: false })
                .limit(3);

            if (photosError) console.error('Error fetching recent photos:', photosError);

            // Calculate stats
            const totalRevenue = validOrders.reduce((sum, order) => sum + (order.total_amount_cents || 0), 0) / 100 || 0;

            setStats({
                totalOrders: validOrders.length || 0,
                totalRevenue,
                recentOrders: validOrders.slice(0, 10) || [],
                recentPhotos: recentPhotos || []
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
                price: modalData.price || 5.00,
                invited_emails: invitedEmails.join(','), // Persist invited emails
                // Assign owner if new and in photographer mode
                ...(isPhotographerView && user && !editingId ? { owner_id: user.id } : {})
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

            // CRITICAL: Update local state immediately to avoid stale data if user re-opens modal before fetch completes
            if (finalLibrary) {
                console.log('[handleSaveGallery] Updating local state for:', finalLibrary.name, 'invited:', finalLibrary.invited_emails);
                setLibraries(prev => {
                    if (editingId) {
                        return prev.map(l => l.id === finalLibrary!.id ? { ...l, ...finalLibrary, photo_count: l.photo_count } : l);
                    } else {
                        return [{ ...finalLibrary!, photo_count: 0 }, ...prev];
                    }
                });
            }

            loadGalleryStats();

            // 6. Handle Invitations - Only send for NEW emails
            console.log('[handleSaveGallery] Checking invites. Current:', invitedEmails, 'Original:', originalInvitedEmails);
            const newEmails = invitedEmails.filter(e => !originalInvitedEmails.includes(e));
            console.log('[handleSaveGallery] New emails calculated:', newEmails);
            if (newEmails.length > 0 && finalLibrary) {
                try {
                    await fetch('/api/gallery/invite', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            libraryId: finalLibrary.id,
                            emails: newEmails
                        })
                    });
                    success(`Invitations sent to ${newEmails.length} new client(s)`);
                } catch (inviteErr) {
                    console.error('Failed to send invitations:', inviteErr);
                    error('Gallery saved, but failed to send invitation emails');
                }
            }
            setInvitedEmails([]);
            setOriginalInvitedEmails([]);
            setNewEmailInput('');
            setIsManaged(false);
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

    const handleApplicationStatus = async (id: string, newStatus: 'approved' | 'rejected') => {
        try {
            const { error: updateError } = await supabase
                .from('photographer_applications')
                .update({ status: newStatus })
                .eq('id', id);

            if (updateError) throw updateError;

            success(`Application ${newStatus}`);
            loadApplications();

            // If approved, we might want to automatically invite them or notify them
            if (newStatus === 'approved') {
                const app = applications.find(a => a.id === id);
                if (app) {
                    // Logic to send invitation email could go here
                    // for now just log it
                    console.log(`Application approved for ${app.email}. Ready for invitation.`);
                }
            }
        } catch (err) {
            error('Failed to update application status');
        }
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
        // Load existing invited emails from library
        console.log('[openEditModal] Opening library:', lib.name);
        console.log('[openEditModal] Raw invited_emails from lib:', lib.invited_emails);

        const existingEmails = lib.invited_emails ? lib.invited_emails.split(',').map(e => e.trim()).filter(e => e.length > 0) : [];
        console.log('[openEditModal] Parsed existingEmails:', existingEmails);

        setInvitedEmails(existingEmails);
        setOriginalInvitedEmails(existingEmails);
        setNewEmailInput('');
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
        setInvitedEmails([]);
        setOriginalInvitedEmails([]);
        setNewEmailInput('');
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
            // New: Also trigger a sync when testing connection
            try {
                info('Resyncing all libraries with Google Drive...');
                const syncRes = await fetch('/api/gallery/sync');
                if (syncRes.ok) {
                    const syncData = await syncRes.json();
                    console.log('[checkAssetHealth] Sync response data:', syncData);
                    // Check if any individual syncs failed
                    const failedSyncs = syncData.results?.filter((r: any) => r.error) || [];
                    const successfulSyncs = syncData.results?.filter((r: any) => !r.error) || [];
                    console.log('[checkAssetHealth] Successful syncs:', successfulSyncs);

                    if (failedSyncs.length > 0 && successfulSyncs.length === 0) {
                        error(`Sync failed for all libraries. ${failedSyncs[0]?.error || 'Check Google Drive credentials.'}`);
                    } else if (failedSyncs.length > 0) {
                        const failedNames = failedSyncs.map((f: any) => f.slug).join(', ');
                        info(`Partially synced. ${successfulSyncs.length} succeeded. Failed: ${failedNames}`); // Show which ones failed
                    } else {
                        const totalAdded = successfulSyncs.reduce((sum: number, r: any) => sum + (r.added || 0), 0);
                        const totalDeleted = successfulSyncs.reduce((sum: number, r: any) => sum + (r.deleted || 0), 0);
                        const totalPhotos = successfulSyncs.reduce((sum: number, r: any) => sum + (r.total || 0), 0);

                        let msg = `Sync complete: ${totalPhotos} photos total.`;
                        if (totalAdded > 0) msg += ` (${totalAdded} new added)`;
                        if (totalDeleted > 0) msg += ` (${totalDeleted} removed)`;
                        if (totalAdded === 0 && totalDeleted === 0) msg = `Sync complete: Archive is up to date (${totalPhotos} photos).`;

                        success(msg);
                    }
                    // Small delay to ensure database commits before refresh
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    await loadGalleryStats(); // Refresh the list to show any new photo counts
                } else {
                    const text = await syncRes.text();
                    let errData;
                    try {
                        errData = JSON.parse(text);
                    } catch {
                        errData = { error: 'Non-JSON response', body: text };
                    }
                    error(`Sync failed: ${errData.error || errData.details || text.substring(0, 50)}`);
                    console.error('Sync failed during connection test:', JSON.stringify(errData, null, 2));
                }
            } catch (syncErr: any) {
                error(`Sync error: ${syncErr.message || 'Network error. Check connection.'}`);
                console.error('Connection test sync error:', JSON.stringify(syncErr, null, 2));
            }
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
            {!isPhotographerView && (
                <>
                    {/* Stats Grid - Only for Admin */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white/5 p-4">
                            <div className="text-[10px] text-white/40 font-black uppercase tracking-[0.2em] mb-1">Total Orders</div>
                            <div className="text-2xl font-bold font-mono text-white">
                                <AnimatedNumber value={stats?.totalOrders || 0} />
                            </div>
                        </div>
                        <div className="bg-white/5 p-4">
                            <div className="text-[10px] text-white/40 font-black uppercase tracking-[0.2em] mb-1">Total Revenue</div>
                            <div className="text-2xl font-bold font-mono text-green-400">
                                $<AnimatedNumber value={stats?.totalRevenue || 0} decimals={2} />
                            </div>
                        </div>
                        <div className="bg-white/5 p-4">
                            <div className="text-[10px] text-white/40 font-black uppercase tracking-[0.2em] mb-1">Recent Activity</div>
                            <div className="text-xs text-white/60 space-y-1 mt-2">
                                {stats?.recentOrders.length === 0 ? (
                                    <div className="text-white/20 italic">No recent orders</div>
                                ) : (
                                    stats?.recentOrders.slice(0, 3).map((order: any) => (
                                        <div key={order.id} className="flex justify-between">
                                            <span>{new Date(order.created_at).toLocaleDateString()}</span>
                                            <span className="text-green-400">${(order.total_amount_cents / 100).toFixed(2)}</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                        <div className="bg-white/5 p-4">
                            <div className="text-[10px] text-white/40 font-black uppercase tracking-[0.2em] mb-2">Latest New Uploads</div>
                            <div className="grid grid-cols-3 gap-2">
                                {stats?.recentPhotos && stats.recentPhotos.length > 0 ? (
                                    stats.recentPhotos.map((photo: any) => {
                                        // Use streaming proxy for reliable image loading
                                        const imageUrl = photo.google_drive_file_id
                                            ? `/api/gallery/stream?fileId=${photo.google_drive_file_id}&size=400`
                                            : photo.thumbnail_url;
                                        return (
                                            <div key={photo.id} className="aspect-square bg-black/50 relative group overflow-hidden">
                                                <img
                                                    src={imageUrl}
                                                    alt={photo.title}
                                                    className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                                                    onError={(e) => {
                                                        // Fallback: hide broken images
                                                        (e.target as HTMLImageElement).style.display = 'none';
                                                    }}
                                                />
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="col-span-3 text-white/20 italic text-xs">No recent photos</div>
                                )}
                            </div>
                        </div>
                    </div>

                </>
            )
            }

            <div className="flex flex-col gap-4 mb-2">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-white p-2">
                            <PhotoIcon className="w-5 h-5 text-black" />
                        </div>
                        <h2 className="text-xl md:text-2xl font-black text-white uppercase tracking-wide whitespace-nowrap flex items-center gap-3">
                            {isPhotographerView ? 'My Galleries' : 'Gallery Management'}
                            {!isPhotographerView && pendingAppsCount > 0 && (
                                <span className="flex items-center justify-center bg-red-500 text-white text-[10px] font-black h-5 w-5 rounded-full animate-pulse">
                                    {pendingAppsCount}
                                </span>
                            )}
                        </h2>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Desktop Only: Back Button */}
                        {!isPhotographerView && (
                            <button
                                onClick={onBack}
                                className="hidden md:flex items-center gap-2 text-white/60 hover:text-white transition-colors mr-2 px-3 py-2 text-sm"
                            >
                                <ArrowLeftIcon className="w-4 h-4" />
                                Back
                            </button>
                        )}
                        <button
                            onClick={openCreateModal}
                            className="px-4 py-2 bg-white text-black text-xs uppercase tracking-wider font-bold flex items-center gap-2 hover:bg-white/90"
                        >
                            <PlusIcon className="w-4 h-4" />
                            <span className="hidden sm:inline">New Gallery</span>
                            <span className="sm:hidden">New</span>
                        </button>
                    </div>
                </div>

                {/* Mobile Only: Back to Dashboard */}
                {!isPhotographerView && (
                    <button
                        onClick={onBack}
                        className="md:hidden flex items-center gap-2 text-white/60 hover:text-white py-1 px-1 text-sm transition-colors self-start"
                    >
                        <ArrowLeftIcon className="w-4 h-4" />
                        Back to Dashboard
                    </button>
                )}

                {/* Secondary Actions (Invite, Test) */}
                <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto mt-2 md:mt-0">
                    {!isPhotographerView && (
                        <button
                            onClick={() => setIsInviteModalOpen(true)}
                            className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white/60 text-xs uppercase tracking-wider font-bold flex items-center justify-center gap-2 w-full sm:w-auto"
                        >
                            <EnvelopeIcon className="w-3 h-3" />
                            <span className="sm:inline">Invite Photographer</span>
                        </button>
                    )}
                    <button
                        onClick={checkAssetHealth}
                        disabled={verifying}
                        className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white/60 text-xs uppercase tracking-wider font-bold flex items-center justify-center gap-2 w-full sm:w-auto"
                    >
                        {verifying ? (
                            <ArrowPathIcon className="w-3 h-3 animate-spin" />
                        ) : (
                            <ChartBarIcon className="w-3 h-3" />
                        )}
                        <span>{verifying ? 'Checking...' : 'Test Connection'}</span>
                    </button>
                </div>
            </div>

            {/* Create/Edit Gallery Modal */}
            {
                isManaged && (
                    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 overflow-y-auto">
                        <div className="bg-black/50 w-full max-w-2xl p-6 relative my-8 max-h-[calc(100vh-4rem)] overflow-y-auto custom-scrollbar rounded-none">
                            <button
                                onClick={() => setIsManaged(false)}
                                className="absolute top-4 right-4 text-white/40 hover:text-white"
                            >
                                <PlusIcon className="w-6 h-6 rotate-45" />
                            </button>

                            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                {editingId ? <PencilIcon className="w-5 h-5 text-white/60" /> : <PlusIcon className="w-5 h-5 text-white/60" />}
                                {editingId ? 'Edit Gallery Settings' : 'Create New Gallery'}
                            </h2>

                            <form onSubmit={handleSaveGallery} className="space-y-6">
                                {/* Gallery Name & Slug */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-1">Gallery Name</label>
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
                                            className="w-full bg-white/5 p-2 text-white placeholder-white/20 focus:outline-none focus:border-white/40 rounded-none"
                                            placeholder="e.g. Summer 2025 Collection"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-1">URL Slug</label>
                                        <div className="flex items-center gap-2 bg-white/5 p-2 opacity-50">
                                            <span className="text-white/40 text-xs">/gallery/</span>
                                            <input
                                                type="text"
                                                required
                                                value={modalData.slug}
                                                onChange={(e) => setModalData({ ...modalData, slug: e.target.value })}
                                                className="bg-transparent text-white w-full focus:outline-none font-mono text-sm rounded-none"
                                                placeholder="summer-2025"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Pricing Options - Full Width */}
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-2">Pricing Options & Bundles</label>
                                    <div className="space-y-2 mb-3">
                                        {pricingOptions.map((option, idx) => {
                                            const isEditing = editingPricingIdx === idx;
                                            return (
                                                <div
                                                    key={idx}
                                                    className="grid items-center gap-4 bg-white/5 p-4 rounded-none w-full"
                                                    style={{ gridTemplateColumns: 'minmax(180px, 1fr) 100px 120px 80px' }}
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
                                                                    className="w-full bg-transparent text-sm text-white focus:outline-none border-b border-white/20 pb-1 rounded-none"
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
                                                                    className="w-full bg-white/5 rounded-none px-2 py-1 text-xs text-center text-white font-mono focus:outline-none focus:border-white/40 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
                                                                    className="w-full bg-white/5 rounded-none px-2 py-1 text-xs text-white font-bold font-mono focus:outline-none focus:border-white/40 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                                />
                                                            </div>
                                                            {/* Done Button */}
                                                            <div className="flex justify-end">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setEditingPricingIdx(null)}
                                                                    className="p-1.5 hover:bg-green-500/20 text-green-400 rounded-none transition-colors"
                                                                    title="Done"
                                                                >
                                                                    <CheckCircleIcon className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <>
                                                            {/* Name Display */}
                                                            <div className="text-sm font-bold text-white truncate pr-2">
                                                                {option.name || <span className="text-white/20 italic">No Name</span>}
                                                            </div>
                                                            {/* Count Display */}
                                                            <div className="text-center border-l border-white/10 pl-2">
                                                                <div className="flex items-center justify-center gap-1">
                                                                    <span className="text-[10px] text-white/40">Count:</span>
                                                                    <span className="text-xs font-mono text-white/80">{option.photo_count === -1 ? 'ALL' : option.photo_count}</span>
                                                                </div>
                                                            </div>
                                                            {/* Price Display */}
                                                            <div className="text-center border-l border-white/10 pl-2">
                                                                <div className="flex items-center justify-center gap-1">
                                                                    <span className="text-xs text-white/40">$</span>
                                                                    <span className="text-sm font-bold font-mono text-green-400">{option.price.toFixed(2)}</span>
                                                                </div>
                                                            </div>
                                                            {/* Action Buttons */}
                                                            <div className="flex gap-1 justify-end pl-2 border-l border-white/10">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setEditingPricingIdx(idx)}
                                                                    className="p-1.5 hover:bg-white/10 text-white/40 hover:text-white rounded-none transition-colors"
                                                                    title="Edit"
                                                                >
                                                                    <PencilIcon className="w-4 h-4" />
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
                                                                    className="p-1.5 hover:bg-red-500/20 text-white/20 hover:text-red-400 rounded-none transition-colors"
                                                                    title="Remove"
                                                                >
                                                                    <TrashIcon className="w-4 h-4" />
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
                                            onClick={() => {
                                                const newOption = { id: '', name: 'Bundle Option', photo_count: 3, price: 10.00 };
                                                setPricingOptions([...pricingOptions, newOption]);
                                                setEditingPricingIdx(pricingOptions.length);
                                            }}
                                            className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-[10px] text-white rounded-none transition-colors uppercase tracking-wider"
                                        >
                                            + Add Option
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const newOption = { id: '', name: 'Full Gallery Commercial License', photo_count: -1, price: 999.00 };
                                                setPricingOptions([...pricingOptions, newOption]);
                                                setEditingPricingIdx(pricingOptions.length);
                                            }}
                                            className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-[10px] text-emerald-400 border border-emerald-500/50 rounded-none transition-colors uppercase tracking-wider"
                                        >
                                            + Add Full License
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-white/30 mt-2">
                                        Use count "-1" for Full Gallery Buyout options. Name options with "Commercial" to trigger commercial licensing checkout flow.
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-1">Description</label>
                                    <textarea
                                        value={modalData.description}
                                        onChange={(e) => setModalData({ ...modalData, description: e.target.value })}
                                        className="w-full bg-white/5 p-2 text-white placeholder-white/20 focus:outline-none focus:border-white/40 min-h-[80px] rounded-none"
                                        placeholder="Brief description of the gallery contents..."
                                    />
                                </div>

                                {/* Client Invitations */}
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-2">Invited Clients</label>

                                    {/* Existing email chips */}
                                    {invitedEmails.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mb-3">
                                            {invitedEmails.map((email, idx) => (
                                                <div
                                                    key={idx}
                                                    className={`flex items-center gap-1 px-2 py-1 text-xs font-mono ${originalInvitedEmails.includes(email)
                                                        ? 'bg-white/10 text-white/60'
                                                        : 'bg-emerald-500/20 text-emerald-400'
                                                        }`}
                                                >
                                                    <span>{email}</span>
                                                    {!originalInvitedEmails.includes(email) && (
                                                        <span className="text-[9px] uppercase ml-1 opacity-60">new</span>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={() => setInvitedEmails(invitedEmails.filter((_, i) => i !== idx))}
                                                        className="ml-1 hover:text-red-400 transition-colors"
                                                    >
                                                        ×
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Add new email input */}
                                    <div className="flex gap-2">
                                        <input
                                            type="email"
                                            value={newEmailInput}
                                            onChange={(e) => setNewEmailInput(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' || e.key === ',') {
                                                    e.preventDefault();
                                                    const email = newEmailInput.trim().replace(',', '');
                                                    if (email && email.includes('@') && !invitedEmails.includes(email)) {
                                                        setInvitedEmails([...invitedEmails, email]);
                                                        setNewEmailInput('');
                                                    }
                                                }
                                            }}
                                            className="flex-1 bg-white/5 p-2 text-white placeholder-white/20 focus:outline-none focus:border-white/40 rounded-none font-mono text-xs"
                                            placeholder="client@example.com"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const email = newEmailInput.trim();
                                                if (email && email.includes('@') && !invitedEmails.includes(email)) {
                                                    setInvitedEmails([...invitedEmails, email]);
                                                    setNewEmailInput('');
                                                }
                                            }}
                                            className="px-4 py-2 bg-white/10 text-white text-xs uppercase font-bold hover:bg-white/20 transition-colors"
                                        >
                                            + Add
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-white/30 mt-2">
                                        Press Enter or click Add. New clients will receive an access link when you save.
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-xs uppercase text-white/40 mb-2">Cover Image</label>
                                    <div className="flex items-start gap-4">
                                        {modalData.cover_image_url && (
                                            <div className="w-24 h-16 bg-zinc-800 rounded-none overflow-hidden flex-shrink-0">
                                                <img src={modalData.cover_image_url} alt="Cover" className="w-full h-full object-cover" />
                                            </div>
                                        )}
                                        <div className="flex-1 space-y-2">
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={modalData.cover_image_url}
                                                    onChange={(e) => setModalData({ ...modalData, cover_image_url: e.target.value })}
                                                    className="flex-1 bg-white/5 p-2 text-xs text-white rounded-none"
                                                    placeholder="https://... (or upload below)"
                                                />
                                            </div>
                                            <div className="flex items-center gap-2 mb-2">
                                                <input
                                                    type="checkbox"
                                                    checked={modalData.is_private}
                                                    onChange={(e) => setModalData({ ...modalData, is_private: e.target.checked })}
                                                    className="w-4 h-4 bg-white/5 border border-white/20 rounded-none focus:ring-0 text-white"
                                                />
                                                <span className="text-white text-xs uppercase tracking-widest">Private Gallery</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    checked={modalData.commercial_included}
                                                    onChange={(e) => setModalData({ ...modalData, commercial_included: e.target.checked })}
                                                    className="w-4 h-4 bg-white/5 border border-white/20 rounded-none focus:ring-0 text-emerald-500"
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
                                               file:rounded-none file:border-0
                                               file:text-xs file:font-semibold
                                               file:bg-white/10 file:text-white
                                               hover:file:bg-white/20"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <hr className="border-white/10" />

                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-3">Asset Source</label>
                                    <div className="flex gap-2 mb-4">
                                        <button
                                            type="button"
                                            onClick={() => setUploadMode('drive')}
                                            className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs uppercase font-bold border ${uploadMode === 'drive' ? 'bg-white text-black border-white' : 'bg-transparent text-white/40 border-white/20 hover:text-white hover:border-white/40'}`}
                                        >
                                            <CloudIcon className="w-4 h-4" /> {editingId ? 'Update Drive Folder' : 'Link Google Drive'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setUploadMode('upload')}
                                            className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs uppercase font-bold border ${uploadMode === 'upload' ? 'bg-white text-black border-white' : 'bg-transparent text-white/40 border-white/20 hover:text-white hover:border-white/40'}`}
                                        >
                                            <ArrowUpTrayIcon className="w-4 h-4" /> {editingId ? 'Add More Photos' : 'Direct Upload'}
                                        </button>
                                    </div>

                                    {uploadMode === 'drive' ? (
                                        <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                                            <label className="block text-xs uppercase text-white/40 mb-1">Google Drive Folder ID</label>
                                            <input
                                                type="text"
                                                value={modalData.google_drive_folder_id}
                                                onChange={(e) => setModalData({ ...modalData, google_drive_folder_id: e.target.value })}
                                                className="w-full bg-white/5 p-2 text-white placeholder-white/20 focus:outline-none focus:border-white/40 font-mono text-xs"
                                                placeholder="1AbCdEfGhIjK..."
                                                required={uploadMode === 'drive' && !filesData.length} // Only required if not uploading files in mixed mode (simplified logic)
                                            />
                                            <p className="text-[10px] text-white/40 mt-1 flex items-center gap-1">
                                                <ExclamationCircleIcon className="w-3 h-3" />
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
                                                    <ArrowUpTrayIcon className="w-6 h-6 text-white/40 mx-auto mb-2" />
                                                    <p className="text-white text-xs uppercase font-bold">Click or Drag Photos Here</p>
                                                    <p className="text-white/40 text-[10px] mt-1">{filesData.length} files selected</p>
                                                </div>
                                            </div>

                                            {filesData.length > 0 && (
                                                <div className="max-h-[220px] overflow-y-auto bg-black/40 p-2 grid grid-cols-2 gap-2 custom-scrollbar">
                                                    {filesData.map((item, i) => (
                                                        <div key={i} className="flex items-center gap-2 overflow-hidden text-xs text-white bg-white/5 p-2 rounded-none relative group">
                                                            <div className="w-10 h-10 flex-shrink-0 bg-black/50 overflow-hidden relative">
                                                                {item.file.type.startsWith('video/') && (
                                                                    <div className="absolute inset-0 flex items-center justify-center z-10">
                                                                        <div className="w-4 h-4 rounded-none bg-white/20 backdrop-blur-sm flex items-center justify-center">
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
                                                                <XMarkIcon className="w-3 h-3" />
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
                                        className="flex-1 py-3 text-white/60 hover:text-white hover:bg-white/5 transition uppercase text-xs font-bold"
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
                )
            }

            <div className="bg-black/50 rounded-none p-6">
                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <PhotoIcon className="w-5 h-5" />
                    GALLERY OPERATIONS
                </h2>

                {/* Health Check Status Banner */}
                {healthStatus === 'issues' && (
                    <div className="mb-6 p-4 bg-red-500/10 border-l-2 border-red-500 text-red-500 flex items-center gap-3">
                        <ExclamationCircleIcon className="w-5 h-5 flex-shrink-0" />
                        <div>
                            <p className="font-bold uppercase text-sm">System Alert: Asset Delivery Issue Detected</p>
                            <p className="text-xs opacity-80 mt-1">Google Drive files may not be public. Users cannot download. Please check 'gallery-ops' skill.</p>
                        </div>
                    </div>
                )}

                {healthStatus === 'healthy' && (
                    <div className="mb-6 p-4 bg-green-500/10 border-l-2 border-green-500 text-green-500 flex items-center gap-3">
                        <CheckCircleIcon className="w-5 h-5 flex-shrink-0" />
                        <div>
                            <p className="font-bold uppercase text-sm">System Healthy</p>
                            <p className="text-xs opacity-80 mt-1">Asset delivery system is fully operational.</p>
                        </div>
                    </div>
                )}

                {/* Key Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                    <div className="bg-white/5 p-4 rounded-none">
                        <div className="flex items-center gap-2 mb-2 text-white/60 text-xs uppercase tracking-wider">
                            <ArrowDownTrayIcon className="w-3 h-3" /> Total Orders
                        </div>
                        <div className="text-3xl font-bold text-white">
                            <AnimatedNumber value={stats?.totalOrders || 0} />
                        </div>
                    </div>

                    <div className="bg-white/5 p-4 rounded-none">
                        <div className="flex items-center gap-2 mb-2 text-white/60 text-xs uppercase tracking-wider">
                            <CurrencyDollarIcon className="w-3 h-3" /> Total Sales
                        </div>
                        <div className="text-3xl font-bold text-green-400">
                            $<AnimatedNumber value={stats?.totalRevenue || 0} />
                        </div>
                    </div>
                </div>

                {!isPhotographerView && (
                    <div className="flex mb-8">
                        <button
                            onClick={() => setActiveTab('galleries')}
                            className={`px-6 py-3 text-xs uppercase font-bold tracking-widest transition-colors relative ${activeTab === 'galleries' ? 'text-white' : 'text-white/40 hover:text-white'}`}
                        >
                            Active Galleries
                            {activeTab === 'galleries' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white" />}
                        </button>
                        <button
                            onClick={() => setActiveTab('applications')}
                            className={`px-6 py-3 text-xs uppercase font-bold tracking-widest transition-colors relative flex items-center gap-2 ${activeTab === 'applications' ? 'text-white' : 'text-white/40 hover:text-white'}`}
                        >
                            Photographer Applications
                            {pendingAppsCount > 0 && (
                                <span className="bg-red-500 text-white text-[9px] px-1 rounded-sm">
                                    {pendingAppsCount}
                                </span>
                            )}
                            {activeTab === 'applications' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white" />}
                        </button>
                    </div>
                )}

                {activeTab === 'galleries' ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Active Galleries */}
                        <div className="bg-white/[0.02] p-6 rounded-none h-full">
                            <div className="flex items-center justify-between mb-4 pb-2">
                                <h3 className="text-sm font-bold text-white uppercase tracking-wide">
                                    Active Galleries ({libraries.length})
                                </h3>
                                <button onClick={loadGalleryStats} className="text-white/40 hover:text-white">
                                    <ArrowPathIcon className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                                </button>
                            </div>

                            {loading && libraries.length === 0 ? (
                                <div className="text-white/40 text-sm py-4">Loading galleries...</div>
                            ) : (
                                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                    {libraries.length === 0 ? (
                                        <div className="text-white/40 text-sm py-4">No galleries found.</div>
                                    ) : (
                                        libraries.map((lib) => {
                                            const isLastNight = lib.name.toUpperCase() === 'LAST NIGHT';
                                            const showCountdown = isLastNight && !countdownExpired && shouldShowCountdown(lib.name, targetTime8PM);

                                            const handleCountdownComplete = async () => {
                                                setCountdownExpired(true);
                                                // Trigger sync when countdown completes
                                                try {
                                                    info('Gallery opening! Syncing photos...');
                                                    const syncRes = await fetch('/api/gallery/sync');
                                                    if (syncRes.ok) {
                                                        success('LAST NIGHT gallery is now live!');
                                                        loadGalleryStats(); // Refresh to show updated photo count
                                                    }
                                                } catch (err) {
                                                    console.error('Sync error:', err);
                                                }
                                            };

                                            return (
                                                <div key={lib.id} className="relative group">
                                                    {/* Countdown Overlay for LAST NIGHT */}
                                                    {showCountdown && (
                                                        <GalleryCountdownOverlay
                                                            coverImageUrl={lib.cover_image_url}
                                                            targetTime={targetTime8PM}
                                                            galleryName={lib.name}
                                                            onCountdownComplete={handleCountdownComplete}
                                                        />
                                                    )}

                                                    <div className="flex items-start justify-between p-3 bg-white/5 hover:bg-white/10 transition-colors">
                                                        <div
                                                            className="flex-1 min-w-0 mr-4 cursor-pointer"
                                                            onClick={() => openEditModal(lib)}
                                                        >
                                                            <div className="flex items-center gap-2 mb-1">
                                                                {lib.is_private ? (
                                                                    <LockClosedIcon className="w-3 h-3 text-yellow-400 flex-shrink-0" />
                                                                ) : (
                                                                    <GlobeAltIcon className="w-3 h-3 text-green-400 flex-shrink-0" />
                                                                )}
                                                                <h4 className="font-bold text-white text-sm truncate">{lib.name}</h4>
                                                            </div>
                                                            <div className="flex items-center gap-2 text-xs text-white/40 font-mono">
                                                                <span>/{lib.slug}</span>
                                                                <span>•</span>
                                                                <span>{lib.photo_count || 0} photos</span>
                                                            </div>
                                                        </div>
                                                        <div className="flex gap-2 transition-opacity">
                                                            <a
                                                                href={`/gallery/${lib.slug}`}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="p-2 hover:bg-white/20 text-white/60 hover:text-white rounded-sm"
                                                                title="View Gallery"
                                                            >
                                                                <ArrowLeftIcon className="w-4 h-4 rotate-180" />
                                                            </a>
                                                            <button
                                                                onClick={() => handleDeleteGallery(lib.id, lib.name)}
                                                                className="p-2 hover:bg-red-500/20 text-white/60 hover:text-red-400 rounded-sm"
                                                                title="Delete Gallery"
                                                            >
                                                                <TrashIcon className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Recent Orders List */}
                        <div className="bg-white/[0.02] p-6 rounded-none h-full">
                            <h3 className="text-sm font-bold text-white uppercase mb-4 tracking-wide pb-2">
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
                                            <div key={order.id} className="flex flex-col md:flex-row md:items-center justify-between p-3 bg-white/5 hover:bg-white/10 transition-colors gap-3">
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
                                                        onClick={() => triggerResend(order.id, order.email)}
                                                        className="text-xs uppercase font-bold text-white/60 hover:text-white px-3 py-1 bg-white/5 hover:bg-white/10 transition"
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
                ) : (
                    <div className="bg-white/[0.02] p-6 rounded-none h-full animate-in fade-in duration-300">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-sm font-bold text-white uppercase tracking-wide">
                                Pending Applications ({pendingAppsCount})
                            </h3>
                            <button onClick={loadApplications} className="text-white/40 hover:text-white">
                                <ArrowPathIcon className={`w-3 h-3 ${appsLoading ? 'animate-spin' : ''}`} />
                            </button>
                        </div>

                        {appsLoading && applications.length === 0 ? (
                            <div className="text-white/40 text-sm py-8 text-center italic">Loading applications...</div>
                        ) : (
                            <div className="space-y-4">
                                {applications.length === 0 ? (
                                    <div className="text-white/40 text-sm py-8 text-center italic">No applications received yet.</div>
                                ) : (
                                    applications.map((app) => (
                                        <div key={app.id} className="bg-white/5 p-5 rounded-none flex flex-col md:flex-row md:items-center justify-between gap-4">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-white font-bold">{app.name}</span>
                                                    <span className={`text-[9px] px-1.5 py-0.5 uppercase font-bold tracking-tighter ${app.status === 'pending' ? 'bg-yellow-500/20 text-yellow-500' :
                                                        app.status === 'approved' ? 'bg-green-500/20 text-green-500' :
                                                            'bg-red-500/20 text-red-500'
                                                        }`}>
                                                        {app.status}
                                                    </span>
                                                </div>
                                                <div className="text-white/60 text-xs font-mono">{app.email}</div>
                                                {app.location && <div className="text-white/40 text-[10px] uppercase font-bold tracking-wider">{app.location}</div>}
                                                {app.cameras && app.cameras.length > 0 && (
                                                    <div className="flex flex-wrap gap-1 mt-2">
                                                        {app.cameras.map((cam: string, idx: number) => (
                                                            <span key={idx} className="bg-white/10 text-white/50 text-[9px] px-1.5 py-0.5 rounded-none">
                                                                {cam}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                                {app.portfolio_link && (
                                                    <a
                                                        href={app.portfolio_link.startsWith('http') ? app.portfolio_link : `https://${app.portfolio_link}`}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="text-blue-400 hover:text-blue-300 text-[10px] block mt-2 underline transition-colors"
                                                    >
                                                        View Portfolio →
                                                    </a>
                                                )}
                                            </div>

                                            {app.status === 'pending' && (
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleApplicationStatus(app.id, 'approved')}
                                                        className="px-4 py-2 bg-green-500/20 hover:bg-green-500 text-green-500 hover:text-black text-[10px] uppercase font-bold transition-all"
                                                    >
                                                        Approve
                                                    </button>
                                                    <button
                                                        onClick={() => handleApplicationStatus(app.id, 'rejected')}
                                                        className="px-4 py-2 bg-red-500/20 hover:bg-red-500/40 text-red-500 text-[10px] uppercase font-bold transition-all"
                                                    >
                                                        Reject
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                )}

            </div>


            {/* Photographer Invite Modal */}
            {
                isInviteModalOpen && (
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                        <div className="bg-[#0A0A0A] w-full max-w-md p-6 relative">
                            <button
                                onClick={() => setIsInviteModalOpen(false)}
                                className="absolute top-4 right-4 text-white/40 hover:text-white"
                            >
                                <XMarkIcon className="w-6 h-6" />
                            </button>
                            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                <EnvelopeIcon className="w-5 h-5 text-white/60" />
                                Invite Photographer
                            </h2>
                            <p className="text-zinc-400 text-sm mb-6">Send an invitation link to a photographer to set up their own gallery connection.</p>

                            <form onSubmit={async (e) => {
                                e.preventDefault();
                                setInviteLoading(true);
                                try {
                                    const res = await fetch('/api/admin/invite-photographer', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify(inviteData)
                                    });
                                    const data = await res.json();
                                    if (res.ok) {
                                        success('Invitation sent! Link: ' + data.inviteUrl);
                                        setIsInviteModalOpen(false);
                                        setInviteData({ email: '', name: '' });
                                    } else {
                                        error(data.error || 'Failed to send');
                                    }
                                } catch (err) {
                                    error('Failed to invite');
                                } finally {
                                    setInviteLoading(false);
                                }
                            }} className="space-y-4">
                                <div>
                                    <label className="block text-xs uppercase text-white/40 mb-1">Photographer Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={inviteData.name}
                                        onChange={e => setInviteData({ ...inviteData, name: e.target.value })}
                                        className="w-full bg-white/5 p-2 text-white placeholder-white/20 focus:outline-none focus:border-white/40"
                                        placeholder="Jane Doe"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs uppercase text-white/40 mb-1">Email Address</label>
                                    <input
                                        type="email"
                                        required
                                        value={inviteData.email}
                                        onChange={e => setInviteData({ ...inviteData, email: e.target.value })}
                                        className="w-full bg-white/5 p-2 text-white placeholder-white/20 focus:outline-none focus:border-white/40"
                                        placeholder="jane@example.com"
                                    />
                                </div>
                                <div className="pt-4 flex justify-end">
                                    <button
                                        type="submit"
                                        disabled={inviteLoading}
                                        className="px-6 py-2 bg-white text-black font-bold uppercase tracking-wider hover:bg-white/90 disabled:opacity-50"
                                    >
                                        {inviteLoading ? 'Sending...' : 'Send Invitation'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
