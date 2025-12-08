-- ============================================
-- Seed Test Products
-- ============================================
-- Run this AFTER products table is created
-- Creates test products for development/testing

-- Clear existing test products (optional)
-- DELETE FROM products WHERE handle LIKE 'test-%';

-- Insert test products
INSERT INTO products (handle, name, slug, title, description, price, compare_at_price, currency, images, available, status, category, featured) VALUES
-- Featured Products
(
  'premium-subscription',
  'Premium Subscription',
  'premium-subscription',
  'Premium Subscription',
  'Get access to all premium features, exclusive content, and priority support. Perfect for power users who want the full experience.',
  29.99,
  39.99,
  'USD',
  ARRAY['https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=800&fit=crop']::text[],
  true,
  'active',
  'subscriptions',
  true
),
(
  'pro-toolkit',
  'Pro Toolkit',
  'pro-toolkit',
  'Pro Toolkit',
  'Complete toolkit for professionals. Includes advanced features, API access, and dedicated support. Everything you need to succeed.',
  99.99,
  149.99,
  'USD',
  ARRAY['https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=800&fit=crop']::text[],
  true,
  'active',
  'tools',
  true
),
(
  'exclusive-content-pack',
  'Exclusive Content Pack',
  'exclusive-content-pack',
  'Exclusive Content Pack',
  'Curated collection of exclusive content, tutorials, and resources. Updated monthly with new materials.',
  49.99,
  NULL,
  'USD',
  ARRAY['https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&h=800&fit=crop']::text[],
  true,
  'active',
  'content',
  true
),

-- Regular Products
(
  'starter-plan',
  'Starter Plan',
  'starter-plan',
  'Starter Plan',
  'Perfect for beginners. Get started with essential features and build your way up.',
  9.99,
  NULL,
  'USD',
  ARRAY['https://images.unsplash.com/photo-1551650975-87deedd944c3?w=800&h=800&fit=crop']::text[],
  true,
  'active',
  'subscriptions',
  false
),
(
  'basic-toolkit',
  'Basic Toolkit',
  'basic-toolkit',
  'Basic Toolkit',
  'Essential tools to get you started. Includes core features and community support.',
  19.99,
  NULL,
  'USD',
  ARRAY['https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=800&h=800&fit=crop']::text[],
  true,
  'active',
  'tools',
  false
),
(
  'monthly-update',
  'Monthly Update',
  'monthly-update',
  'Monthly Update',
  'Stay current with monthly updates, new features, and improvements.',
  4.99,
  NULL,
  'USD',
  ARRAY['https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=800&fit=crop']::text[],
  true,
  'active',
  'updates',
  false
),
(
  'community-access',
  'Community Access',
  'community-access',
  'Community Access',
  'Join our exclusive community. Connect with other users, share ideas, and get support.',
  14.99,
  NULL,
  'USD',
  ARRAY['https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&h=800&fit=crop']::text[],
  true,
  'active',
  'community',
  false
),
(
  'api-access',
  'API Access',
  'api-access',
  'API Access',
  'Full API access for developers. Build integrations and automate workflows.',
  79.99,
  NULL,
  'USD',
  ARRAY['https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&h=800&fit=crop']::text[],
  true,
  'active',
  'developer',
  false
),
(
  'enterprise-solution',
  'Enterprise Solution',
  'enterprise-solution',
  'Enterprise Solution',
  'Custom enterprise solution with dedicated support, custom integrations, and SLA guarantees.',
  499.99,
  NULL,
  'USD',
  ARRAY['https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&h=800&fit=crop']::text[],
  true,
  'active',
  'enterprise',
  false
),
(
  'free-trial',
  'Free Trial',
  'free-trial',
  'Free Trial',
  'Try our platform free for 14 days. No credit card required.',
  0.00,
  NULL,
  'USD',
  ARRAY['https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=800&fit=crop']::text[],
  true,
  'active',
  'subscriptions',
  false
)
ON CONFLICT (handle) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  compare_at_price = EXCLUDED.compare_at_price,
  images = EXCLUDED.images,
  available = EXCLUDED.available,
  status = EXCLUDED.status,
  category = EXCLUDED.category,
  featured = EXCLUDED.featured,
  updated_at = NOW();

-- Verify products were created
SELECT 
  handle,
  title,
  price,
  currency,
  category,
  featured,
  available
FROM products
ORDER BY featured DESC, created_at DESC;

