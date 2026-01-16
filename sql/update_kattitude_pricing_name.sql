-- Rename "Single Photo (Commercial License)" to "Single Photo" for Kattitude
UPDATE gallery_pricing_options
SET name = 'Single Photo'
WHERE name = 'Single Photo (Commercial License)'
AND library_id = (SELECT id FROM photo_libraries WHERE slug = 'kattitude-tattoo');
