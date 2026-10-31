/**
 * The studio brand kit every photographer gets in BRAND KIT on /dashboard.
 *
 * The files in public/brand/kit/ are the owner's originals from Google Drive
 * ("SCOT33.png" and "SCOT33 WHITE.png"), copied byte for byte. To change the
 * kit, replace those files or add an entry here.
 *
 * The rules come from what the brand already says, not from taste:
 *   - monochrome only: noir-design ("Background: ALWAYS #000000", white text)
 *     and EMAIL_BRAND_STYLING.md ("No bright colors (except white text on black)")
 *   - no effects: no-border-design (no borders, shadows, glows, gradients)
 *   - never pass yourself off as the studio: Photographer Terms §14
 *   - credit handle @tlau.media: gallery-ops (house credit)
 */

export interface KitFile {
  id: string;
  name: string;
  file: string;
  /** Download filename. */
  download: string;
  /** Background to preview it on. */
  previewOn: 'black' | 'white';
  use: string;
  spec: string;
}

export const STUDIO_KIT: KitFile[] = [
  {
    id: 'scot33-white',
    name: 'SCOT33 — White',
    file: '/brand/kit/SCOT33-white.png',
    download: 'SCOT33-white.png',
    previewOn: 'black',
    use: 'On black, and on dark photos.',
    spec: 'PNG · transparent background · 1200 × 1200',
  },
  {
    id: 'scot33-black',
    name: 'SCOT33 — Black',
    file: '/brand/kit/SCOT33-black.png',
    download: 'SCOT33-black.png',
    previewOn: 'white',
    use: 'On white, and on light photos.',
    spec: 'PNG · transparent background · 900 × 900',
  },
];

export interface GuidelineSection {
  title: string;
  points: string[];
  /** Things that must never happen. Rendered as DON'T. */
  never?: string[];
}

export const BRAND_NAME = 'THE LOST+UNFOUNDS';
export const BRAND_TAGLINE = 'CAN YOU SEE US?';
export const BRAND_CREDIT = '@tlau.media';

export const GUIDELINES: GuidelineSection[] = [
  {
    title: 'The Mark',
    points: [
      'SCOT33 is the mark of THE LOST+UNFOUNDS. It always comes with its ring of lettering: THE LOST+UNFOUNDS above, CAN YOU SEE US? below.',
      'Write the name THE LOST+UNFOUNDS: all capitals, a plus sign, no spaces. Never "Lost and Unfounds" or "TLAU" in public copy.',
    ],
  },
  {
    title: 'Colour',
    points: [
      'Black or white. Nothing else. The brand is monochrome.',
      'White on dark backgrounds and dark photos. Black on light backgrounds and light photos.',
      'If neither reads, move it to a calmer part of the image.',
    ],
    never: [
      'Recolour it, tint it, or fill it with a colour, gradient or pattern.',
      'Put it on a box, badge or plate to make it read.',
    ],
  },
  {
    title: 'Use The File As Supplied',
    points: [
      'Scale it from a corner so it keeps its shape.',
      'Keep clear space on every side at least a quarter of the logo’s width. Nothing else (type, edges, other logos) goes in it.',
      'Smallest size: 150 px wide on screen, 32 mm (1¼ in) wide in print, so CAN YOU SEE US? stays readable.',
    ],
    never: [
      'Stretch, squash, rotate, skew or crop it.',
      'Redraw it, retype the lettering, or split SCOT33 from its lettering.',
      'Add shadows, outlines, glows, bevels or textures.',
      'Lower its opacity until it fades into the photo.',
    ],
  },
  {
    title: 'Where You Can Use It',
    points: [
      'Posts and stories of work you shot on a studio job. Tag @tlau.media.',
      'Your portfolio, to show you have worked with the studio.',
      'Share graphics for a studio gallery or event you covered.',
    ],
    never: [
      'Anything that suggests you are the studio or speak for it: your business cards, your invoices, your own ads, your email signature (Photographer Terms §14).',
      'Merch, prints or anything sold, unless the studio sold it.',
      'Endorsing another brand, cause or person.',
      'Stamping it on client photos unless the studio asked you to.',
    ],
  },
  {
    title: 'Questions',
    points: [
      'Not sure a use is OK? Ask before you post: Photographer → Ask For Anything.',
    ],
  },
];

/* ── Your own folder (private bucket `brand-kits`, `<user id>/...`) ───── */

export const MY_KIT_BUCKET = 'brand-kits';
export const MY_KIT_MAX_MB = 50;
export const MY_KIT_ACCEPT = '.png,.jpg,.jpeg,.webp,.svg,.pdf,.ai,.eps,.zip,image/png,image/jpeg,image/webp,image/svg+xml,application/pdf,application/postscript,application/illustrator,application/zip';
const MY_KIT_TYPES: Record<string, string> = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', svg: 'image/svg+xml',
  pdf: 'application/pdf', ai: 'application/postscript', eps: 'application/postscript', zip: 'application/zip',
};

/**
 * Content type to upload with, from the extension. Browsers report .ai and
 * .eps inconsistently (often empty), and the bucket only accepts listed types.
 */
export function myKitContentType(file: File): string | null {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  return MY_KIT_TYPES[ext] || null;
}

export function isPreviewable(name: string): boolean {
  return /\.(png|jpe?g|webp)$/i.test(name);
}
