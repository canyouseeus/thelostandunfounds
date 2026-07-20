/**
 * Pre-generates background-removed (transparent) PNGs for shop products and
 * writes them to public/product-transparent/<sha256(imageUrl).slice(0,32)>.png
 *
 * These are served as static Vercel assets (see useBackgroundRemoval hook) so
 * the shop's outlined images cost ZERO Supabase egress and require no in-browser
 * WASM. Re-run this whenever the Fourthwall product images change:
 *
 *   # one-time: the removal model is a heavy native dep, kept OUT of the app's
 *   # package.json on purpose (not needed at build/runtime — the PNGs are static)
 *   npm i -D --no-save @imgly/background-removal-node
 *   node scripts/generate-transparent-product-images.mjs
 *
 * Source of truth for the product list is the production shop API.
 */
import { removeBackground } from '@imgly/background-removal-node';
import sharp from 'sharp';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

// Shop cards render ~292px; 600px is ample at 2x.
const MAX_PX = 600;
// White sticker outline baked into the PNG (16 evenly-spaced silhouettes = a
// gap-free ring). Baking it here avoids the CSS drop-shadow chain, which
// COMPOUNDS (each shadow stacks on the previous) and read ~2x too thick. At
// MAX_PX=600 an OUTLINE_PX of 6 renders ~3px at the shop's display size.
const OUTLINE_PX = 6;

/** Composite a white outline around the cutout onto a transparent canvas. */
async function bakeOutline(cutBuf) {
  const m = await sharp(cutBuf).metadata();
  const alpha = await sharp(cutBuf).extractChannel(3).raw().toBuffer();
  const whiteSil = await sharp({ create: { width: m.width, height: m.height, channels: 3, background: { r: 255, g: 255, b: 255 } } })
    .joinChannel(alpha, { raw: { width: m.width, height: m.height, channels: 1 } })
    .png().toBuffer();
  const R = OUTLINE_PX;
  const offsets = Array.from({ length: 16 }, (_, i) => {
    const a = (i / 16) * 2 * Math.PI;
    return [Math.round(Math.cos(a) * R), Math.round(Math.sin(a) * R)];
  });
  const comps = offsets.map(([dx, dy]) => ({ input: whiteSil, left: R + dx, top: R + dy }));
  comps.push({ input: cutBuf, left: R, top: R });
  return sharp({ create: { width: m.width + 2 * R, height: m.height + 2 * R, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(comps).png({ compressionLevel: 9 }).toBuffer();
}

const PRODUCTS_URL = process.env.PRODUCTS_URL || 'https://thelostandunfounds.com/api/shop/products';
const OUT_DIR = path.resolve('public/product-transparent');

/** MUST match the hash used by src/hooks/useBackgroundRemoval.ts */
export function toFilename(url) {
  return crypto.createHash('sha256').update(url).digest('hex').slice(0, 32) + '.png';
}

async function fetchProducts() {
  const res = await fetch(PRODUCTS_URL, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`products API ${res.status}`);
  const data = await res.json();
  return (data.products || [])
    .map((p) => ({ title: (p.title || '').replace(/\s+/g, ' ').trim(), url: (p.images && p.images[0]) || '' }))
    .filter((p) => p.url);
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const products = await fetchProducts();
  console.log(`Found ${products.length} products with images.`);

  let made = 0, skipped = 0, failed = 0;
  for (const p of products) {
    const file = toFilename(p.url);
    const dest = path.join(OUT_DIR, file);
    try {
      await fs.access(dest);
      console.log(`  = ${p.title} (exists ${file})`);
      skipped++;
      continue;
    } catch {}
    try {
      process.stdout.write(`  … ${p.title} → ${file} `);
      const blob = await removeBackground(p.url, { output: { format: 'image/png', quality: 0.9 } });
      const raw = Buffer.from(await blob.arrayBuffer());
      const cut = await sharp(raw)
        .resize({ width: MAX_PX, height: MAX_PX, fit: 'inside', withoutEnlargement: true })
        .png()
        .toBuffer();
      const buf = await bakeOutline(cut);
      await fs.writeFile(dest, buf);
      console.log(`OK (${(buf.length / 1024).toFixed(0)}kb)`);
      made++;
    } catch (e) {
      console.log(`FAILED: ${e.message}`);
      failed++;
    }
  }
  console.log(`\nDone. made=${made} skipped=${skipped} failed=${failed}`);
  if (failed) process.exitCode = 1;
}

main().catch((e) => { console.error(e); process.exit(1); });
