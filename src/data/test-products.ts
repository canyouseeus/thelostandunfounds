// Test products used only in local development (import.meta.env.DEV)
// Keeps the Shop page working when API routes aren't running.
export const TEST_PRODUCTS = [
  {
    id: 'test-hoodie',
    title: 'TL+U Dev Hoodie',
    description: 'Cozy black hoodie for local testing.',
    price: 42,
    compareAtPrice: 60,
    currency: 'USD',
    images: ['https://dummyimage.com/800x800/111/ffffff.png&text=Dev+Hoodie'],
    handle: 'dev-hoodie',
    available: true,
    url: '#',
    category: 'apparel',
    featured: true,
  },
  {
    id: 'test-tee',
    title: 'TL+U Dev Tee',
    description: 'Soft tee to verify layout and checkout.',
    price: 18,
    compareAtPrice: 28,
    currency: 'USD',
    images: ['https://dummyimage.com/800x800/111/ffffff.png&text=Dev+Tee'],
    handle: 'dev-tee',
    available: true,
    url: '#',
    category: 'apparel',
    featured: false,
  },
  {
    id: 'test-cap',
    title: 'TL+U Dev Cap',
    description: 'Simple cap placeholder for dev mode.',
    price: 15,
    compareAtPrice: 22,
    currency: 'USD',
    images: ['https://dummyimage.com/800x800/111/ffffff.png&text=Dev+Cap'],
    handle: 'dev-cap',
    available: true,
    url: '#',
    category: 'accessories',
    featured: false,
  },
  {
    id: 'test-sticker-pack',
    title: 'Sticker Pack (Dev)',
    description: 'Sticker set to validate free items.',
    price: 0,
    compareAtPrice: 5,
    currency: 'USD',
    images: ['https://dummyimage.com/800x800/111/ffffff.png&text=Dev+Stickers'],
    handle: 'dev-stickers',
    available: true,
    url: '#',
    category: 'accessories',
    featured: false,
  },
  {
    id: 'test-poster',
    title: 'Poster (Dev)',
    description: 'Poster placeholder for gallery layouts.',
    price: 12,
    compareAtPrice: 20,
    currency: 'USD',
    images: ['https://dummyimage.com/800x800/111/ffffff.png&text=Dev+Poster'],
    handle: 'dev-poster',
    available: false,
    url: '#',
    category: 'prints',
    featured: false,
  },
  {
    id: 'prodigi-test-fine-art-print',
    title: 'Fine Art Print — Dev Mockup',
    description: 'Prodigi print-on-demand test product with a mockup template preview.',
    price: 65,
    compareAtPrice: undefined,
    currency: 'USD',
    images: ['https://dummyimage.com/1000x1000/222/ffffff.png&text=Artwork'],
    handle: 'dev-prodigi-print',
    available: true,
    url: '#',
    category: 'prints',
    featured: true,
    productKind: 'physical',
    fulfillment: 'prodigi',
    prodigiProductId: 'dev-prodigi-product-id',
    prodigiSku: 'GLOBAL-CFPM-16X20',
    mockupTemplateUrl: 'https://dummyimage.com/1200x900/000/333333.png&text=Wall+Mockup',
    mockupBounds: { x: 32, y: 20, width: 36, height: 46 },
  },
]











