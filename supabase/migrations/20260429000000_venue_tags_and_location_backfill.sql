-- ─── Step 1: Insert venue tags for Austin venues ────────────────────────────
-- These mirror Drive subfolder names so the photo sync can stamp canonical
-- venue coordinates onto photos, replacing raw EXIF GPS for map plotting.
INSERT INTO tags (name, type, slug, metadata) VALUES
  ('Lucky Duck',          'venue', 'venue-lucky-duck',          '{"city":"Austin","state":"TX","latitude":30.2626,"longitude":-97.7250,"radius_meters":100}'::jsonb),
  ('Coconut Club',        'venue', 'venue-coconut-club',        '{"city":"Austin","state":"TX","latitude":30.2656,"longitude":-97.7439,"radius_meters":100}'::jsonb),
  ('Hotel Vegas',         'venue', 'venue-hotel-vegas',         '{"city":"Austin","state":"TX","latitude":30.2634,"longitude":-97.7273,"radius_meters":100}'::jsonb),
  ('Rose Room',           'venue', 'venue-rose-room',           '{"city":"Austin","state":"TX","latitude":30.3977,"longitude":-97.7237,"radius_meters":150}'::jsonb),
  ('La Perla',            'venue', 'venue-la-perla',            '{"city":"Austin","state":"TX","latitude":30.2632,"longitude":-97.7266,"radius_meters":100}'::jsonb),
  ('Latchkey',            'venue', 'venue-latchkey',            '{"city":"Austin","state":"TX","latitude":30.2627,"longitude":-97.7251,"radius_meters":100}'::jsonb),
  ('Wiggle Room',         'venue', 'venue-wiggle-room',         '{"city":"Austin","state":"TX","latitude":30.2686,"longitude":-97.7470,"radius_meters":100}'::jsonb),
  ('Neon Grotto',         'venue', 'venue-neon-grotto',         '{"city":"Austin","state":"TX","latitude":30.2660,"longitude":-97.7438,"radius_meters":100}'::jsonb),
  ('Toulouse',            'venue', 'venue-toulouse',            '{"city":"Austin","state":"TX","latitude":30.2672,"longitude":-97.7405,"radius_meters":100}'::jsonb),
  ('Shangri-La',          'venue', 'venue-shangri-la',          '{"city":"Austin","state":"TX","latitude":30.2640,"longitude":-97.7293,"radius_meters":100}'::jsonb),
  ('Ropollos',            'venue', 'venue-ropollos',            '{"city":"Austin","state":"TX","latitude":30.2672,"longitude":-97.7405,"radius_meters":80}'::jsonb),
  ('Fareground',          'venue', 'venue-fareground',          '{"city":"Austin","state":"TX","latitude":30.2643,"longitude":-97.7441,"radius_meters":100}'::jsonb),
  ('Cosmic Saltillo',     'venue', 'venue-cosmic-saltillo',     '{"city":"Austin","state":"TX","latitude":30.2594,"longitude":-97.7251,"radius_meters":100}'::jsonb),
  ('DUB Academy',         'venue', 'venue-dub-academy',         '{"city":"Austin","state":"TX","latitude":30.2621,"longitude":-97.7312,"radius_meters":100}'::jsonb),
  ('Liberty',             'venue', 'venue-liberty',             '{"city":"Austin","state":"TX","latitude":30.2629,"longitude":-97.7247,"radius_meters":100}'::jsonb),
  ('Halal Time',          'venue', 'venue-halal-time',          '{"city":"Austin","state":"TX","latitude":30.2623,"longitude":-97.7245,"radius_meters":80}'::jsonb),
  ('Riches Art Gallery',  'venue', 'venue-riches-art-gallery',  '{"city":"Austin","state":"TX","latitude":30.2593,"longitude":-97.7118,"radius_meters":100}'::jsonb),
  ('Coyote Ugly',         'venue', 'venue-coyote-ugly',         '{"city":"Austin","state":"TX","latitude":30.2666,"longitude":-97.7379,"radius_meters":80}'::jsonb),
  ('Aburi Oshi Sushi',    'venue', 'venue-aburi-oshi-sushi',    '{"city":"Austin","state":"TX","latitude":30.2643,"longitude":-97.7441,"radius_meters":80}'::jsonb),
  ('Bluffs',              'venue', 'venue-bluffs',              '{"city":"Austin","state":"TX","latitude":30.2668,"longitude":-97.7387,"radius_meters":100}'::jsonb),
  ('Fade Box E 5th',      'venue', 'venue-fade-box-e-5th',      '{"city":"Austin","state":"TX","latitude":30.2614,"longitude":-97.7280,"radius_meters":100}'::jsonb)
ON CONFLICT (slug) DO NOTHING;

-- ─── Step 2: Backfill location_name from nearest venue tag within radius ─────
-- For each photo that has GPS but no location_name, find the nearest venue
-- tag whose canonical position is within its radius and stamp the venue's
-- name onto the photo. Uses a LATERAL subquery to pick the single nearest
-- match per photo (avoids multiple-row UPDATE conflicts when radii overlap).
WITH matches AS (
  SELECT
    p.id AS photo_id,
    nearest.tag_name
  FROM photos p
  CROSS JOIN LATERAL (
    SELECT
      t.name AS tag_name,
      6371000 * 2 * asin(sqrt(
        power(sin(radians(((t.metadata->>'latitude')::float - p.latitude)) / 2), 2)
        + cos(radians(p.latitude))
        * cos(radians((t.metadata->>'latitude')::float))
        * power(sin(radians(((t.metadata->>'longitude')::float - p.longitude)) / 2), 2)
      )) AS distance_m,
      coalesce((t.metadata->>'radius_meters')::float, 300) AS radius_m
    FROM tags t
    WHERE t.type = 'venue'
      AND t.metadata ? 'latitude'
      AND t.metadata ? 'longitude'
    ORDER BY 2 ASC
    LIMIT 1
  ) AS nearest
  WHERE p.latitude IS NOT NULL
    AND p.longitude IS NOT NULL
    AND p.location_name IS NULL
    AND nearest.distance_m <= nearest.radius_m
)
UPDATE photos p
SET location_name = m.tag_name
FROM matches m
WHERE m.photo_id = p.id;
