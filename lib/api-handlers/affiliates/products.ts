/**
 * GET /api/affiliates/products
 *
 * Returns all promotable products for the affiliate deep-link generator:
 *   - Gallery collections (from photo_libraries + gallery_pricing_options)
 *
 * Future: add Fourthwall shop products, digital downloads, events.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export async function products(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  );

  // ── Galleries ──────────────────────────────────────────────────────────────
  // Fetch public galleries with their cheapest active pricing option
  const { data: libraries, error: libError } = await supabase
    .from('photo_libraries')
    .select(`
      id,
      name,
      slug,
      cover_image_url,
      price,
      created_at,
      is_private,
      gallery_pricing_options!inner(photo_count, price, is_active)
    `)
    .eq('is_private', false)
    .order('created_at', { ascending: false });

  if (libError) {
    console.error('products: gallery query error', libError);
    return res.status(500).json({ error: libError.message });
  }

  // Count all-time sales per gallery
  const { data: saleCounts } = await supabase
    .from('photo_orders')
    .select('library_id, id')
    .not('status', 'eq', 'cancelled');

  const salesByLibrary: Record<string, number> = {};
  for (const row of saleCounts || []) {
    if (row.library_id) {
      salesByLibrary[row.library_id] = (salesByLibrary[row.library_id] || 0) + 1;
    }
  }

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const galleryProducts = (libraries || []).map((lib: any) => {
    // Use the gallery's base price; fall back to the cheapest active pricing option
    const pricingOptions: any[] = lib.gallery_pricing_options || [];
    const activePrices = pricingOptions
      .filter((o: any) => o.is_active && o.price > 0)
      .sort((a: any, b: any) => a.photo_count - b.photo_count);

    const lowestPrice =
      activePrices.length > 0 ? parseFloat(activePrices[0].price) : parseFloat(lib.price || 5);

    const salesCount = salesByLibrary[lib.id] || 0;
    const isNew = new Date(lib.created_at) > thirtyDaysAgo;
    const isHot = salesCount >= 50;

    const pricingTiers = activePrices.map((o: any) => ({
      quantity: o.photo_count,
      price: parseFloat(o.price),
    }));

    return {
      id: lib.id,
      title: lib.name,
      type: 'gallery',
      price: lowestPrice,
      profit: lowestPrice, // gallery revenue flows directly to the site
      url: `/gallery/${lib.slug}`,
      image: lib.cover_image_url || null,
      salesCount,
      isNew,
      isHot,
      category: 'gallery',
      pricingTiers: pricingTiers.length > 0 ? pricingTiers : undefined,
    };
  });

  return res.status(200).json({ products: galleryProducts });
}
