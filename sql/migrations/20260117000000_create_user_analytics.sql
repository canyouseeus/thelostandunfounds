
-- Create user_analytics table
CREATE TABLE IF NOT EXISTS user_analytics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    event_type TEXT NOT NULL, -- 'read_article', 'app_usage', 'page_view'
    resource_id TEXT, -- e.g., blog-slug, app-name
    metadata JSONB DEFAULT '{}'::jsonb,
    duration INTEGER, -- time in seconds
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_analytics_user_id ON user_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_user_analytics_event_type ON user_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_user_analytics_created_at ON user_analytics(created_at);

-- RLS Policies
ALTER TABLE user_analytics ENABLE ROW LEVEL SECURITY;

-- Users can insert their own analytics
CREATE POLICY "Users can insert their own analytics"
    ON user_analytics FOR INSERT
    WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Admin can view all analytics (assuming admin role or public for now for local dev simplicity, but restricting to authenticated users generally)
CREATE POLICY "Admins can view all analytics"
    ON user_analytics FOR SELECT
    USING (true); -- Relaxed for development/demo, ideally specific admin check
