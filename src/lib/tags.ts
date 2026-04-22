import type { SupabaseClient } from '@supabase/supabase-js';

export type TagType = 'location' | 'venue' | 'collection' | 'people' | 'event' | 'custom';

export interface Tag {
  id: string;
  name: string;
  type: TagType;
  slug: string;
  metadata: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

export interface PhotoTag {
  id: string;
  photo_id: string;
  tag_id: string;
  created_at: string;
}

function generateSlug(name: string, type: TagType): string {
  const base = name
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
  return `${type}-${base}`;
}

export async function createTag(
  supabase: SupabaseClient,
  name: string,
  type: TagType,
  metadata?: Record<string, any>
): Promise<Tag> {
  const slug = generateSlug(name, type);
  const { data, error } = await supabase
    .from('tags')
    .insert({ name, type, slug, metadata: metadata || null })
    .select()
    .single();
  if (error) throw error;
  return data as Tag;
}

export async function addTagToPhoto(
  supabase: SupabaseClient,
  photoId: string,
  tagId: string
): Promise<PhotoTag> {
  const { data, error } = await supabase
    .from('photo_tags')
    .insert({ photo_id: photoId, tag_id: tagId })
    .select()
    .single();
  if (error) throw error;
  return data as PhotoTag;
}

export async function removeTagFromPhoto(
  supabase: SupabaseClient,
  photoId: string,
  tagId: string
): Promise<void> {
  const { error } = await supabase
    .from('photo_tags')
    .delete()
    .eq('photo_id', photoId)
    .eq('tag_id', tagId);
  if (error) throw error;
}

export async function getPhotoTags(
  supabase: SupabaseClient,
  photoId: string
): Promise<Tag[]> {
  const { data, error } = await supabase
    .from('photo_tags')
    .select('tags(*)')
    .eq('photo_id', photoId);
  if (error) throw error;
  return (data || []).map((row: any) => row.tags).filter(Boolean) as Tag[];
}

export async function getPhotosByTag(
  supabase: SupabaseClient,
  tagId: string,
  options?: { page?: number; pageSize?: number }
): Promise<{ photos: any[]; count: number }> {
  const { page = 1, pageSize = 50 } = options || {};
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await supabase
    .from('photo_tags')
    .select('photos(*)', { count: 'exact' })
    .eq('tag_id', tagId)
    .range(from, to);

  if (error) throw error;
  return {
    photos: (data || []).map((row: any) => row.photos).filter(Boolean),
    count: count || 0,
  };
}

export async function getPhotosByTags(
  supabase: SupabaseClient,
  tagIds: string[],
  matchAll = false
): Promise<any[]> {
  if (tagIds.length === 0) return [];

  const { data, error } = await supabase
    .from('photo_tags')
    .select('photo_id, tag_id')
    .in('tag_id', tagIds);

  if (error) throw error;
  if (!data || data.length === 0) return [];

  let photoIds: string[];

  if (matchAll) {
    const photoTagMap = new Map<string, Set<string>>();
    for (const row of data) {
      if (!photoTagMap.has(row.photo_id)) photoTagMap.set(row.photo_id, new Set());
      photoTagMap.get(row.photo_id)!.add(row.tag_id);
    }
    photoIds = [...photoTagMap.entries()]
      .filter(([, tags]) => tagIds.every(id => tags.has(id)))
      .map(([photoId]) => photoId);
  } else {
    photoIds = [...new Set(data.map(row => row.photo_id))];
  }

  if (photoIds.length === 0) return [];

  const { data: photos, error: photosError } = await supabase
    .from('photos')
    .select('*')
    .in('id', photoIds);

  if (photosError) throw photosError;
  return photos || [];
}

export async function searchTags(
  supabase: SupabaseClient,
  query: string,
  type?: TagType
): Promise<Tag[]> {
  let q = supabase
    .from('tags')
    .select('*')
    .ilike('name', `%${query}%`)
    .order('name')
    .limit(50);

  if (type) q = q.eq('type', type);

  const { data, error } = await q;
  if (error) throw error;
  return (data || []) as Tag[];
}

export async function bulkTagPhotos(
  supabase: SupabaseClient,
  photoIds: string[],
  tagIds: string[]
): Promise<void> {
  if (photoIds.length === 0 || tagIds.length === 0) return;

  const rows = photoIds.flatMap(photoId =>
    tagIds.map(tagId => ({ photo_id: photoId, tag_id: tagId }))
  );

  const { error } = await supabase
    .from('photo_tags')
    .upsert(rows, { onConflict: 'photo_id,tag_id', ignoreDuplicates: true });

  if (error) throw error;
}
