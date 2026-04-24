-- ─── Step 1: Backfill lat/lng from metadata->location JSON ───────────────────
-- Photos synced before the GPS columns existed have coordinates stored in
-- imageMediaMetadata (metadata.location) but null lat/lng columns.
UPDATE photos
SET
  latitude  = (metadata -> 'location' ->> 'latitude')::DOUBLE PRECISION,
  longitude = (metadata -> 'location' ->> 'longitude')::DOUBLE PRECISION
WHERE
  latitude  IS NULL
  AND longitude IS NULL
  AND (metadata -> 'location' ->> 'latitude')  IS NOT NULL
  AND (metadata -> 'location' ->> 'longitude') IS NOT NULL;

-- ─── Step 2: Backfill location_name from @tlau_ filename for photos with GPS ─
-- Parse the city slug from the filename and title-case it for display.
UPDATE photos
SET location_name = initcap(replace(
  (regexp_match(title, '^@tlau_\d{4}-\d{2}-\d{2}_([a-z][a-z0-9_]*)_[a-z][a-z0-9_]*_\d{3}$'))[1],
  '_', ' '
))
WHERE
  location_name IS NULL
  AND latitude   IS NOT NULL
  AND title ~ '^@tlau_\d{4}-\d{2}-\d{2}_[a-z]';

-- ─── Step 3: Assign approximate city-level GPS for photos still missing coords ─
-- Uses the location slug embedded in the @tlau_ filename.
-- Coordinates are city centroids (not exact — used for map clustering only).
WITH city_coords (slug, lat, lon, display_name) AS (
  VALUES
    ('austin',         30.2672,   -97.7431, 'Austin'),
    ('east_austin',    30.2716,   -97.7214, 'East Austin'),
    ('south_austin',   30.2371,   -97.7697, 'South Austin'),
    ('north_austin',   30.3507,   -97.7166, 'North Austin'),
    ('houston',        29.7604,   -95.3698, 'Houston'),
    ('dallas',         32.7767,   -96.7970, 'Dallas'),
    ('san_antonio',    29.4241,   -98.4936, 'San Antonio'),
    ('new_york',       40.7128,   -74.0060, 'New York'),
    ('brooklyn',       40.6782,   -73.9442, 'Brooklyn'),
    ('manhattan',      40.7831,   -73.9712, 'Manhattan'),
    ('los_angeles',    34.0522,  -118.2437, 'Los Angeles'),
    ('chicago',        41.8781,   -87.6298, 'Chicago'),
    ('nashville',      36.1627,   -86.7816, 'Nashville'),
    ('atlanta',        33.7490,   -84.3880, 'Atlanta'),
    ('miami',          25.7617,   -80.1918, 'Miami'),
    ('denver',         39.7392,  -104.9903, 'Denver'),
    ('seattle',        47.6062,  -122.3321, 'Seattle'),
    ('portland',       45.5051,  -122.6750, 'Portland'),
    ('san_francisco',  37.7749,  -122.4194, 'San Francisco')
),
-- Extract the location slug from each photo's @tlau_ title.
-- Checks two-word slugs first (e.g. "east_austin") then falls back to one-word.
title_slugs AS (
  SELECT
    id,
    CASE
      WHEN title ~ '^@tlau_\d{4}-\d{2}-\d{2}_east_austin_'   THEN 'east_austin'
      WHEN title ~ '^@tlau_\d{4}-\d{2}-\d{2}_south_austin_'  THEN 'south_austin'
      WHEN title ~ '^@tlau_\d{4}-\d{2}-\d{2}_north_austin_'  THEN 'north_austin'
      WHEN title ~ '^@tlau_\d{4}-\d{2}-\d{2}_new_york_'      THEN 'new_york'
      WHEN title ~ '^@tlau_\d{4}-\d{2}-\d{2}_los_angeles_'   THEN 'los_angeles'
      WHEN title ~ '^@tlau_\d{4}-\d{2}-\d{2}_san_antonio_'   THEN 'san_antonio'
      WHEN title ~ '^@tlau_\d{4}-\d{2}-\d{2}_san_francisco_' THEN 'san_francisco'
      ELSE (regexp_match(title, '^@tlau_\d{4}-\d{2}-\d{2}_([a-z][a-z0-9]*)_'))[1]
    END AS city_slug
  FROM photos
  WHERE latitude IS NULL AND longitude IS NULL
    AND title ~ '^@tlau_\d{4}-\d{2}-\d{2}_[a-z]'
)
UPDATE photos p
SET
  latitude      = c.lat,
  longitude     = c.lon,
  location_name = COALESCE(p.location_name, c.display_name)
FROM title_slugs ts
JOIN city_coords c ON c.slug = ts.city_slug
WHERE p.id = ts.id;
