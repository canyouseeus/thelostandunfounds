import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createServiceSupabaseClient } from '../../lib/api-handlers/_supabase-admin-client';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = createServiceSupabaseClient();
    const { q, tagId, cameraModel, dateFrom, dateTo, libraryId, limit = '40' } = req.query;

    const searchQuery = typeof q === 'string' ? q.trim() : '';
    const pageLimit = Math.min(parseInt(typeof limit === 'string' ? limit : '40', 10), 100);

    // Resolve tag-name matches to photo IDs
    let tagPhotoIds: string[] | null = null;

    if (tagId && typeof tagId === 'string') {
      const { data: tagRows } = await supabase
        .from('photo_tags')
        .select('photo_id')
        .eq('tag_id', tagId);
      tagPhotoIds = (tagRows || []).map((r: any) => r.photo_id);
      if (tagPhotoIds.length === 0)
        return res.status(200).json({ photos: [], total: 0, query: searchQuery });
    }

    if (searchQuery && !tagId) {
      const { data: matchingTags } = await supabase
        .from('tags')
        .select('id')
        .ilike('name', `%${searchQuery}%`);

      if (matchingTags && matchingTags.length > 0) {
        const matchingTagIds = matchingTags.map((t: any) => t.id);
        const { data: tagRows } = await supabase
          .from('photo_tags')
          .select('photo_id')
          .in('tag_id', matchingTagIds);
        const tagMatchedIds = [...new Set((tagRows || []).map((r: any) => r.photo_id))];
        tagPhotoIds = tagPhotoIds
          ? [...new Set([...tagPhotoIds, ...tagMatchedIds])]
          : tagMatchedIds;
      }
    }

    let photoQuery = supabase
      .from('photos')
      .select(
        `id, title, google_drive_file_id, thumbnail_url, library_id, created_at,
         metadata, latitude, longitude, location_name,
         photo_libraries!library_id(name, slug)`,
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })
      .limit(pageLimit);

    if (libraryId && typeof libraryId === 'string') photoQuery = photoQuery.eq('library_id', libraryId);
    if (cameraModel && typeof cameraModel === 'string') photoQuery = photoQuery.eq('metadata->>camera_model', cameraModel);
    if (dateFrom && typeof dateFrom === 'string') photoQuery = photoQuery.gte('created_at', dateFrom);
    if (dateTo && typeof dateTo === 'string') photoQuery = photoQuery.lte('created_at', dateTo + 'T23:59:59');

    if (searchQuery) {
      const orFilter = [
        `title.ilike.%${searchQuery}%`,
        `location_name.ilike.%${searchQuery}%`,
        `metadata->>camera_make.ilike.%${searchQuery}%`,
        `metadata->>camera_model.ilike.%${searchQuery}%`,
        `search_date_text.ilike.%${searchQuery}%`,
      ].join(',');
      if (tagPhotoIds && tagPhotoIds.length > 0) {
        photoQuery = photoQuery.or(`${orFilter},id.in.(${tagPhotoIds.join(',')})`);
      } else {
        photoQuery = photoQuery.or(orFilter);
      }
    } else if (tagPhotoIds) {
      photoQuery = photoQuery.in('id', tagPhotoIds);
    }

    const { data: photos, count, error } = await photoQuery;
    if (error) return res.status(500).json({ error: error.message });

    // Fetch tags for result photos
    const photoIds = (photos || []).map((p: any) => p.id);
    const photoTagMap: Record<string, any[]> = {};

    if (photoIds.length > 0) {
      const { data: ptRows } = await supabase
        .from('photo_tags')
        .select('photo_id, tags(id, name, type)')
        .in('photo_id', photoIds);

      for (const row of (ptRows || []) as any[]) {
        if (!photoTagMap[row.photo_id]) photoTagMap[row.photo_id] = [];
        if (row.tags) photoTagMap[row.photo_id].push(row.tags);
      }
    }

    const enriched = (photos || []).map((p: any) => ({
      ...p,
      library_name: p.photo_libraries?.name ?? null,
      library_slug: p.photo_libraries?.slug ?? null,
      photo_libraries: undefined,
      tags: photoTagMap[p.id] || [],
    }));

    return res.status(200).json({ photos: enriched, total: count || 0, query: searchQuery });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
