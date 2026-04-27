-- Ensure anonymous and authenticated users can read non-private photo libraries.
-- The unified gallery view (PhotoGallery 'all-public' mode) needs this so visitors
-- can resolve the list of public library IDs before querying photos.
--
-- Idempotent: drops then re-creates the policy. Does NOT toggle RLS state on the
-- table — that's controlled separately to avoid breaking other access paths.

DROP POLICY IF EXISTS "Public can view non-private libraries" ON photo_libraries;

CREATE POLICY "Public can view non-private libraries"
  ON photo_libraries
  FOR SELECT
  TO anon, authenticated
  USING (is_private = false);
