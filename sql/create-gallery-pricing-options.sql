-- Create gallery_pricing_options table
CREATE TABLE IF NOT EXISTS gallery_pricing_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    library_id UUID REFERENCES photo_libraries(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    photo_count INTEGER NOT NULL DEFAULT 1, -- 1 = single, -1 = all, >1 = bundle size
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE gallery_pricing_options ENABLE ROW LEVEL SECURITY;

-- Policy: Public read
CREATE POLICY "Public pricing access" ON gallery_pricing_options
    FOR SELECT TO public USING (true);

-- Policy: Admin write (using service role in app, but for safety if user authenticated management added later)
CREATE POLICY "Admin pricing management" ON gallery_pricing_options
    FOR ALL TO authenticated USING (true);

-- Migration: Create default pricing for existing libraries based on their 'price' column or default $5
INSERT INTO gallery_pricing_options (library_id, name, price, photo_count)
SELECT 
    id, 
    'Single Photo', 
    COALESCE(price, 5.00), 
    1 
FROM photo_libraries
WHERE NOT EXISTS (
    SELECT 1 FROM gallery_pricing_options WHERE gallery_pricing_options.library_id = photo_libraries.id
);
