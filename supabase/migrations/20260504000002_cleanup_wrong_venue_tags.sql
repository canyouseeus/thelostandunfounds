-- Cleanup wrong venue tags on photos.
--
-- Two complementary passes:
--
-- 1) GPS check — drop a (photo, venue) tag when the photo has GPS and that
--    GPS is outside the venue's radius (default 75m, or per-venue override).
--    Catches the dramatically wrong cases (e.g. photos tagged "Electric
--    Church" but shot 2km away from the church).
--
-- 2) Folder check — drop a venue tag when the photo lives in a Drive folder
--    whose name token-matches a *different* venue. Folder name is recorded
--    as the photo's 'collection' tag during sync. This catches photos shot
--    at venue B whose GPS happens to fall inside venue A's radius (dense
--    bar districts). Folder is the authoritative signal.
--
-- The new sync code (api-handlers/_photo-sync-utils.ts) already prevents
-- both classes of wrong tags from being inserted going forward; this
-- migration just cleans the existing rows.

-- ─── Pass 1: GPS-radius cleanup ───────────────────────────────────────────
WITH venue_tags AS (
  SELECT id,
         (metadata->>'latitude')::float8  AS vlat,
         (metadata->>'longitude')::float8 AS vlng,
         COALESCE((metadata->>'radius_meters')::float8, 75) AS vradius
  FROM tags
  WHERE type = 'venue' AND metadata ? 'latitude' AND metadata ? 'longitude'
),
gps_wrong AS (
  SELECT pt.photo_id, pt.tag_id
  FROM photo_tags pt
  JOIN venue_tags vt ON vt.id = pt.tag_id
  JOIN photos p      ON p.id  = pt.photo_id
  WHERE p.latitude IS NOT NULL
    AND p.longitude IS NOT NULL
    AND 2 * 6371000 * asin(sqrt(
          sin(radians(p.latitude  - vt.vlat) / 2) ^ 2 +
          cos(radians(vt.vlat)) * cos(radians(p.latitude)) *
          sin(radians(p.longitude - vt.vlng) / 2) ^ 2
        )) > vt.vradius
)
DELETE FROM photo_tags pt
USING gps_wrong gw
WHERE pt.photo_id = gw.photo_id AND pt.tag_id = gw.tag_id;

-- ─── Pass 2: Folder-mismatch cleanup ──────────────────────────────────────
-- For each (photo, venue) pair: keep it if the photo has *any* collection
-- tag whose name shares a significant word (>=4 chars) with the venue
-- name. Otherwise, only drop it when the photo has another venue tag that
-- *does* match a collection tag — that means we're confident which venue
-- the photo belongs to, and the unmatched ones are wrong.
WITH venue_words AS (
  SELECT id, name,
         lower(unnest(regexp_split_to_array(
           regexp_replace(lower(name), '[^a-z0-9 ]', ' ', 'g'),
           '\s+'
         ))) AS word
  FROM tags
  WHERE type = 'venue'
),
significant_venue_words AS (
  SELECT id, word FROM venue_words WHERE length(word) >= 4
),
photo_collection_text AS (
  SELECT pt.photo_id,
         lower(string_agg(t.name, ' ')) AS col_text
  FROM photo_tags pt
  JOIN tags t ON t.id = pt.tag_id
  WHERE t.type = 'collection'
  GROUP BY pt.photo_id
),
photo_venue_match AS (
  -- venue tags whose name shares a >=4-char word with the photo's collection text
  SELECT DISTINCT pt.photo_id, pt.tag_id
  FROM photo_tags pt
  JOIN tags vt ON vt.id = pt.tag_id AND vt.type = 'venue'
  JOIN significant_venue_words svw ON svw.id = vt.id
  JOIN photo_collection_text pct  ON pct.photo_id = pt.photo_id
  WHERE pct.col_text LIKE '%' || svw.word || '%'
),
folder_wrong AS (
  SELECT pt.photo_id, pt.tag_id
  FROM photo_tags pt
  JOIN tags vt ON vt.id = pt.tag_id AND vt.type = 'venue'
  WHERE NOT EXISTS (
          SELECT 1 FROM photo_venue_match m
          WHERE m.photo_id = pt.photo_id AND m.tag_id = pt.tag_id
        )
    AND EXISTS (
          -- photo has some other venue tag that matched a collection — so
          -- we know which venue this photo really belongs to
          SELECT 1 FROM photo_venue_match m2
          WHERE m2.photo_id = pt.photo_id
        )
)
DELETE FROM photo_tags pt
USING folder_wrong fw
WHERE pt.photo_id = fw.photo_id AND pt.tag_id = fw.tag_id;
