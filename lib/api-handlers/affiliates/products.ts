/**
 * GET /api/affiliates/products
 *
 * Returns all promotable products for the affiliate deep-link generator:
 *   - Fourthwall shop products (physical apparel/merch)
 *   - Gallery collections (photo_libraries)
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { getFourthwallProducts } from '../../fourthwall/handler.js';

export async function products(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  );

  // ── Fourthwall (physical shop) ─────────────────────────────────────────────
  let physicalProducts: any[] = [];
  try {
    const token = process.env.FOURTHWALL_STOREFRONT_TOKEN;
    if (token) {
      // Use the same multi-strategy fetcher the shop page uses (collections fallback etc.)
      const fwProducts = await getFourthwallProducts(token);

      // Look up production costs so we can calculate creator profit per product.
      // Use the lowest (base) cost for each product to show the best-case profit.
      const productIds = fwProducts.map((p: any) => p.id).filter(Boolean);
      let costByProductId: Record<string, number> = {};
      if (productIds.length > 0) {
        const { data: costRows } = await supabase
          .from('product_costs')
          .select('product_id, cost')
          .in('product_id', productIds)
          .eq('source', 'fourthwall');
        for (const row of costRows || []) {
          const existing = costByProductId[row.product_id];
          const cost = parseFloat(row.cost);
          // Keep the lowest cost variant (most common/base size)
          if (existing === undefined || cost < existing) {
            costByProductId[row.product_id] = cost;
          }
        }
      }

      physicalProducts = fwProducts.map((p: any) => {
        const productId = p.id || p.handle;
        const price = p.price || 0;
        const cost = costByProductId[productId];
        // profit = retail price minus production cost; null if cost unknown
        const profit = cost !== undefined ? Math.max(0, price - cost) : null;
        return {
          id: productId,
          title: p.title,
          type: 'physical',
          price,
          profit,
          url: p.url,
          image: Array.isArray(p.images) ? p.images[0] : (p.image || null),
          salesCount: 0,
          isNew: false,
          isHot: false,
          category: 'physical',
        };
      });
    }
  } catch (err: any) {
    console.warn('affiliates/products: Fourthwall fetch failed:', err?.message);
  }

  // ── Galleries ──────────────────────────────────────────────────────────────
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
  }

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
    const pricingOptions: any[] = lib.gallery_pricing_options || [];
    const activePrices = pricingOptions
      .filter((o: any) => o.is_active && o.price > 0)
      .sort((a: any, b: any) => a.photo_count - b.photo_count);

    const lowestPrice =
      activePrices.length > 0 ? parseFloat(activePrices[0].price) : parseFloat(lib.price || 5);

    const salesCount = salesByLibrary[lib.id] || 0;
    const pricingTiers = activePrices.map((o: any) => ({
      quantity: o.photo_count,
      price: parseFloat(o.price),
    }));

    return {
      id: lib.id,
      title: lib.name,
      type: 'gallery',
      price: lowestPrice,
      profit: lowestPrice,
      url: `/gallery/${lib.slug}`,
      image: lib.cover_image_url || null,
      salesCount,
      isNew: new Date(lib.created_at) > thirtyDaysAgo,
      isHot: salesCount >= 50,
      category: 'gallery',
      pricingTiers: pricingTiers.length > 0 ? pricingTiers : undefined,
    };
  });

  return res.status(200).json({
    products: [...physicalProducts, ...galleryProducts],
  });
}
