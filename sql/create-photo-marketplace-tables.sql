-- Photo Marketplace Schema

-- 1. Photo Libraries (e.g., Kattitude Tattoo Studio)
CREATE TABLE IF NOT EXISTS public.photo_libraries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    cover_image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Photos
CREATE TABLE IF NOT EXISTS public.photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    library_id UUID REFERENCES public.photo_libraries(id) ON DELETE CASCADE,
    title TEXT,
    google_drive_file_id TEXT NOT NULL,
    thumbnail_url TEXT, -- Watermarked/Public version
    price_cents INTEGER DEFAULT 500, -- Default $5.00
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'pending')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Photo Orders
CREATE TABLE IF NOT EXISTS public.photo_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    email TEXT NOT NULL,
    total_amount_cents INTEGER NOT NULL,
    currency TEXT DEFAULT 'USD',
    paypal_order_id TEXT UNIQUE,
    payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Photo Entitlements (Actual access to the file)
CREATE TABLE IF NOT EXISTS public.photo_entitlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.photo_orders(id) ON DELETE CASCADE,
    photo_id UUID REFERENCES public.photos(id) ON DELETE CASCADE,
    token UUID DEFAULT gen_random_uuid(), -- Unique access token
    expires_at TIMESTAMPTZ,
    download_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.photo_libraries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photo_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photo_entitlements ENABLE ROW LEVEL SECURITY;

-- Policies (Public can view libraries and photos)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public can view photo libraries') THEN
        CREATE POLICY "Public can view photo libraries" ON public.photo_libraries FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public can view photos') THEN
        CREATE POLICY "Public can view photos" ON public.photos FOR SELECT USING (status = 'active');
    END IF;
END $$;

-- Orders and Entitlements (Restricted)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their own orders') THEN
        CREATE POLICY "Users can view their own orders" ON public.photo_orders FOR SELECT USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their own entitlements') THEN
        CREATE POLICY "Users can view their own entitlements" ON public.photo_entitlements FOR SELECT USING (
            EXISTS (
                SELECT 1 FROM public.photo_orders 
                WHERE id = photo_entitlements.order_id 
                AND user_id = auth.uid()
            )
        );
    END IF;
END $$;

-- Functions
CREATE OR REPLACE FUNCTION public.handle_photo_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers
DROP TRIGGER IF EXISTS update_photo_libraries_updated_at ON public.photo_libraries;
CREATE TRIGGER update_photo_libraries_updated_at
    BEFORE UPDATE ON public.photo_libraries
    FOR EACH ROW
    EXECUTE PROCEDURE public.handle_photo_updated_at();

DROP TRIGGER IF EXISTS update_photos_updated_at ON public.photos;
CREATE TRIGGER update_photos_updated_at
    BEFORE UPDATE ON public.photos
    FOR EACH ROW
    EXECUTE PROCEDURE public.handle_photo_updated_at();

DROP TRIGGER IF EXISTS update_photo_orders_updated_at ON public.photo_orders;
CREATE TRIGGER update_photo_orders_updated_at
    BEFORE UPDATE ON public.photo_orders
    FOR EACH ROW
    EXECUTE PROCEDURE public.handle_photo_updated_at();
