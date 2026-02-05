import { useState, useRef } from 'react';
import { ArrowUpTrayIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { supabase } from '../lib/supabase';
import { LoadingSpinner } from './Loading';
import { useToast } from './Toast';

interface ImageUploadProps {
  currentImageUrl?: string;
  onUpload: (url: string) => void;
  bucket: 'avatars' | 'banners';
  userId: string;
  type: 'avatar' | 'banner';
  className?: string;
}

export default function ImageUpload({
  currentImageUrl,
  onUpload,
  bucket,
  userId,
  type,
  className = '',
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentImageUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { success, error: showError } = useToast();

  const maxSize = type === 'avatar' ? 2 * 1024 * 1024 : 5 * 1024 * 1024; // 2MB for avatars, 5MB for banners
  const acceptedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = event.target.files?.[0];
      if (!file) return;

      // Validate file type
      if (!acceptedTypes.includes(file.type)) {
        showError('Please upload a valid image (JPEG, PNG, WebP, or GIF)');
        return;
      }

      // Validate file size
      if (file.size > maxSize) {
        showError(`Image size must be less than ${maxSize / 1024 / 1024}MB`);
        return;
      }

      setUploading(true);

      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${Date.now()}.${fileExt}`;

      // Delete old image if exists
      if (currentImageUrl) {
        const oldPath = currentImageUrl.split('/').slice(-2).join('/');
        await supabase.storage.from(bucket).remove([oldPath]);
      }

      // Upload new image
      const { data, error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);

      setPreview(publicUrl);
      onUpload(publicUrl);
      success(`${type === 'avatar' ? 'Profile picture' : 'Banner'} updated successfully!`);
    } catch (error) {
      console.error('Upload error:', error);
      showError('Failed to upload image. Please try again.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = async () => {
    if (!currentImageUrl) return;

    try {
      setUploading(true);

      // Delete from storage
      const path = currentImageUrl.split('/').slice(-2).join('/');
      const { error: deleteError } = await supabase.storage
        .from(bucket)
        .remove([path]);

      if (deleteError) throw deleteError;

      setPreview(null);
      onUpload('');
      success(`${type === 'avatar' ? 'Profile picture' : 'Banner'} removed successfully!`);
    } catch (error) {
      console.error('Remove error:', error);
      showError('Failed to remove image. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={className}>
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedTypes.join(',')}
        onChange={handleFileSelect}
        disabled={uploading}
        className="hidden"
        id={`${type}-upload-${userId}`}
      />

      <div className="relative">
        {preview ? (
          <div className="relative group">
            <img
              src={preview}
              alt={type === 'avatar' ? 'Profile picture' : 'Banner'}
              className={`w-full h-full object-cover ${type === 'avatar' ? 'rounded-full' : 'rounded-none'
                }`}
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="p-2 bg-white text-black rounded-full hover:bg-white/90 transition"
                title="Change"
              >
                <ArrowUpTrayIcon className="w-4 h-4" />
              </button>
              <button
                onClick={handleRemove}
                disabled={uploading}
                className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition"
                title="Remove"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <label
            htmlFor={`${type}-upload-${userId}`}
            className={`flex flex-col items-center justify-center cursor-pointer border-2 border-dashed border-white/20 hover:border-white/40 transition ${type === 'avatar' ? 'w-32 h-32 rounded-full' : 'w-full h-48 rounded-none'
              }`}
          >
            {uploading ? (
              <LoadingSpinner size="lg" className="text-white/60" />
            ) : (
              <>
                <ArrowUpTrayIcon className="w-8 h-8 text-white/60 mb-2" />
                <span className="text-white/60 text-sm">
                  Upload {type === 'avatar' ? 'Avatar' : 'Banner'}
                </span>
                <span className="text-white/40 text-xs mt-1">
                  Max {maxSize / 1024 / 1024}MB
                </span>
              </>
            )}
          </label>
        )}
      </div>
    </div>
  );
}



