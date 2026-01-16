-- Add commercial_included flag to photo_libraries
ALTER TABLE photo_libraries 
ADD COLUMN IF NOT EXISTS commercial_included BOOLEAN DEFAULT false;

-- Remove the $999 pricing option for Kattitude (slug 'kattitude-tattoo')
DELETE FROM gallery_pricing_options 
WHERE price = 999.00 
AND library_id IN (
    SELECT id FROM photo_libraries WHERE slug = 'kattitude-tattoo'
);

-- Update Kattitude library to have commercial_included = true
UPDATE photo_libraries 
SET commercial_included = true 
WHERE slug = 'kattitude-tattoo';
