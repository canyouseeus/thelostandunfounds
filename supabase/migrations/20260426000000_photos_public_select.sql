-- Allow public (anon + authenticated) to SELECT photos.
--
-- The /photos/<slug> gallery pages are visited anonymously, but the
-- photos table has RLS enabled without a public SELECT policy, so the
-- anon role receives 0 rows and the gallery renders
-- "NO ITEMS FOUND IN THIS VAULT SECTION." Service-role calls (cron sync,
-- /api/gallery/* handlers) are unaffected because they bypass RLS.

ALTER TABLE photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "photos_public_read" ON photos;
CREATE POLICY "photos_public_read"
  ON photos
  FOR SELECT
  TO anon, authenticated
  USING (true);
