-- Fix the photos SELECT policy to honor the invited_emails field on photo_libraries.
-- Previously only owner (user_id), public libraries, admin role, and hardcoded admin
-- emails had access. Now any email listed in the comma-separated invited_emails column
-- can also view photos in that private library.

DROP POLICY IF EXISTS "Users can view photos in accessible libraries" ON photos;

CREATE POLICY "Users can view photos in accessible libraries" ON photos
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM photo_libraries
        WHERE photo_libraries.id = photos.library_id
          AND (
              -- Public library
              photo_libraries.is_private = false
              -- Owner access
              OR (SELECT auth.uid()) = photo_libraries.user_id
              -- Admin role in user_roles table
              OR EXISTS (
                  SELECT 1 FROM user_roles
                  WHERE user_roles.user_id = (SELECT auth.uid())
                    AND user_roles.is_admin = true
              )
              -- Hardcoded admin emails
              OR ((SELECT auth.jwt()) ->> 'email') = ANY (
                  ARRAY['thelostandunfounds@gmail.com', 'admin@thelostandunfounds.com']
              )
              -- Invited client emails (comma-separated list on the library row)
              OR (
                  photo_libraries.invited_emails IS NOT NULL
                  AND photo_libraries.invited_emails <> ''
                  AND ((SELECT auth.jwt()) ->> 'email') = ANY (
                      string_to_array(replace(photo_libraries.invited_emails, ' ', ''), ',')
                  )
              )
          )
    )
);
