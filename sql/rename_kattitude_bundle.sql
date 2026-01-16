-- Rename "Elite Archive" to "Deluxe Bundle" for Kattitude
UPDATE gallery_pricing_options
SET name = 'Deluxe Bundle'
WHERE name = 'Elite Archive'
AND library_id = (SELECT id FROM photo_libraries WHERE slug = 'kattitude-tattoo');
