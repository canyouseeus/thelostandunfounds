-- Add missing pricing bundles for Kattitude gallery
DO $$
DECLARE
    kattitude_id UUID;
BEGIN
    -- Get the library ID for Kattitude
    SELECT id INTO kattitude_id FROM photo_libraries WHERE slug = 'kattitude-tattoo';

    -- Insert implicit "Standard Bundle" (3 photos for $8.00)
    INSERT INTO gallery_pricing_options (library_id, name, price, photo_count, is_active)
    VALUES (kattitude_id, 'Standard Bundle', 8.00, 3, true);

    -- Insert "Elite Archive" (25 photos for $37.50)
    INSERT INTO gallery_pricing_options (library_id, name, price, photo_count, is_active)
    VALUES (kattitude_id, 'Elite Archive', 37.50, 25, true);
END $$;
