/**
 * Brand Assets Management Component
 * Allows admins to upload and manage brand assets (images and videos)
 */

import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from './Toast';
import { Upload, Image, Video, X, Trash2, Download, Loader } from 'lucide-react';
import { LoadingSpinner } from './Loading';

interface BrandAsset {
  id: string;
  name: string;
  path: string;
  url: string;
  type: 'image' | 'video';
  size: number;
  created_at: string;
}

const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg'];
const ALLOWED_VIDEO_TYPES = ['video/mp4'];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const STORAGE_BUCKET = 'brand-assets';

export default function BrandAssets() {
  const { success, error: showError } = useToast();
  const [assets, setAssets] = useState<BrandAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadAssets();
  }, []);

  const loadAssets = async () => {
    try {
      setLoading(true);
      
      // List all files in the brand-assets bucket
      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .list('', {
          limit: 100,
          offset: 0,
          sortBy: { column: 'created_at', order: 'desc' },
        });

      if (error) {
        // If bucket doesn't exist, create it
        if (error.message.includes('not found') || error.message.includes('does not exist')) {
          console.log('Bucket does not exist, will be created on first upload');
          setAssets([]);
          setLoading(false);
          return;
        }
        throw error;
      }

      // Get public URLs for each asset
      const assetsWithUrls = await Promise.all(
        (data || []).map(async (file) => {
          const { data: urlData } = supabase.storage
            .from(STORAGE_BUCKET)
            .getPublicUrl(file.name);

          const isImage = file.metadata?.mimetype?.startsWith('image/') ||
                         file.name.toLowerCase().match(/\.(png|jpg|jpeg)$/);
          const isVideo = file.metadata?.mimetype?.startsWith('video/') ||
                         file.name.toLowerCase().match(/\.(mp4)$/);

          return {
            id: file.id || file.name,
            name: file.name,
            path: file.name,
            url: urlData.publicUrl,
            type: isImage ? 'image' as const : isVideo ? 'video' as const : 'image' as const,
            size: file.metadata?.size || 0,
            created_at: file.created_at || file.updated_at || new Date().toISOString(),
          };
        })
      );

      setAssets(assetsWithUrls);
    } catch (error: any) {
      console.error('Error loading assets:', error);
      showError(`Failed to load assets: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const validateFile = (file: File): string | null => {
    // Check file type
    const isImage = ALLOWED_IMAGE_TYPES.includes(file.type) || 
                   file.name.toLowerCase().match(/\.(png|jpg|jpeg)$/);
    const isVideo = ALLOWED_VIDEO_TYPES.includes(file.type) ||
                   file.name.toLowerCase().match(/\.(mp4)$/);

    if (!isImage && !isVideo) {
      return 'Only PNG, JPG, and MP4 files are allowed';
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return `File size must be less than ${MAX_FILE_SIZE / (1024 * 1024)}MB`;
    }

    return null;
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const validationError = validateFile(file);
    
    if (validationError) {
      showError(validationError);
      return;
    }

    await uploadFile(file);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadFile = async (file: File) => {
    try {
      setUploading(true);
      setUploadProgress(0);

      // Generate unique filename with timestamp
      const timestamp = Date.now();
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const fileName = `${timestamp}_${sanitizedName}`;

      // Upload file to Supabase Storage
      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        // If bucket doesn't exist, try to create it (requires admin privileges)
        if (error.message.includes('not found') || error.message.includes('does not exist')) {
          showError('Storage bucket does not exist. Please create a "brand-assets" bucket in Supabase Storage first.');
          return;
        }
        throw error;
      }

      setUploadProgress(100);
      success(`Successfully uploaded ${file.name}`);
      
      // Reload assets
      await loadAssets();
    } catch (error: any) {
      console.error('Error uploading file:', error);
      showError(`Failed to upload file: ${error.message}`);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDelete = async (asset: BrandAsset) => {
    if (!confirm(`Are you sure you want to delete "${asset.name}"?`)) {
      return;
    }

    try {
      const { error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .remove([asset.path]);

      if (error) throw error;

      success(`Deleted ${asset.name}`);
      await loadAssets();
    } catch (error: any) {
      console.error('Error deleting asset:', error);
      showError(`Failed to delete asset: ${error.message}`);
    }
  };

  const handleDownload = (asset: BrandAsset) => {
    const link = document.createElement('a');
    link.href = asset.url;
    link.download = asset.name;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <div className="bg-black/50 border border-white/10 rounded-none p-6">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <Upload className="w-5 h-5" />
          Upload Brand Assets
        </h2>
        <p className="text-white/60 text-sm mb-4">
          Upload PNG, JPG images or MP4 videos. Maximum file size: {MAX_FILE_SIZE / (1024 * 1024)}MB
        </p>
        
        <div className="space-y-4">
          {/* File Input - Hidden but accessible */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".png,.jpg,.jpeg,.mp4,image/png,image/jpeg,video/mp4"
            onChange={handleFileSelect}
            className="hidden"
            id="brand-asset-upload"
            disabled={uploading}
          />
          
          {/* Upload Button */}
          <label
            htmlFor="brand-asset-upload"
            className={`inline-flex items-center gap-2 px-6 py-3 bg-white text-black font-semibold rounded-none hover:bg-white/90 transition cursor-pointer ${
              uploading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {uploading ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-5 h-5" />
                Choose File to Upload
              </>
            )}
          </label>

          {/* Upload Progress */}
          {uploading && uploadProgress > 0 && (
            <div className="w-full bg-white/10 rounded-none h-2">
              <div
                className="bg-white h-2 transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          )}

          <p className="text-white/40 text-xs">
            Supported formats: PNG, JPG, MP4. Works on desktop, tablet, and mobile devices.
          </p>
        </div>
      </div>

      {/* Assets Gallery */}
      <div className="bg-black/50 border border-white/10 rounded-none p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Image className="w-5 h-5" />
            Brand Assets ({assets.length})
          </h2>
        </div>

        {assets.length === 0 ? (
          <div className="text-center py-12">
            <Image className="w-16 h-16 text-white/20 mx-auto mb-4" />
            <p className="text-white/60 mb-2">No assets uploaded yet</p>
            <p className="text-white/40 text-sm">Upload your first brand asset to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {assets.map((asset) => (
              <div
                key={asset.id}
                className="bg-black/30 border border-white/10 rounded-none p-4 hover:border-white/20 transition group"
              >
                {/* Preview */}
                <div className="relative aspect-square mb-3 bg-black/50 rounded-none overflow-hidden">
                  {asset.type === 'image' ? (
                    <img
                      src={asset.url}
                      alt={asset.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <video
                      src={asset.url}
                      className="w-full h-full object-cover"
                      controls={false}
                      muted
                      playsInline
                    />
                  )}
                  
                  {/* Type Badge */}
                  <div className="absolute top-2 right-2">
                    {asset.type === 'image' ? (
                      <div className="px-2 py-1 bg-blue-400/20 text-blue-400 border border-blue-400/30 rounded text-xs flex items-center gap-1">
                        <Image className="w-3 h-3" />
                        Image
                      </div>
                    ) : (
                      <div className="px-2 py-1 bg-purple-400/20 text-purple-400 border border-purple-400/30 rounded text-xs flex items-center gap-1">
                        <Video className="w-3 h-3" />
                        Video
                      </div>
                    )}
                  </div>

                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      onClick={() => handleDownload(asset)}
                      className="p-2 bg-white/20 hover:bg-white/30 rounded transition"
                      title="Download"
                    >
                      <Download className="w-4 h-4 text-white" />
                    </button>
                    <button
                      onClick={() => handleDelete(asset)}
                      className="p-2 bg-red-500/20 hover:bg-red-500/30 rounded transition"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4 text-white" />
                    </button>
                  </div>
                </div>

                {/* Asset Info */}
                <div className="space-y-1">
                  <p className="text-white font-medium text-sm truncate" title={asset.name}>
                    {asset.name}
                  </p>
                  <div className="flex items-center justify-between text-xs text-white/60">
                    <span>{formatFileSize(asset.size)}</span>
                    <span>
                      {new Date(asset.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                </div>

                {/* Copy URL Button */}
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(asset.url);
                    success('URL copied to clipboard!');
                  }}
                  className="w-full mt-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-none text-white text-xs transition"
                >
                  Copy URL
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
