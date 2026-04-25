CREATE TABLE IF NOT EXISTS sync_progress (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  library_slug text NOT NULL DEFAULT 'main',
  subfolder_id text NOT NULL,
  subfolder_name text,
  status text NOT NULL DEFAULT 'pending',
  photos_synced int DEFAULT 0,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(library_slug, subfolder_id)
);

CREATE INDEX IF NOT EXISTS sync_progress_status_idx
  ON sync_progress (library_slug, status, subfolder_name);
