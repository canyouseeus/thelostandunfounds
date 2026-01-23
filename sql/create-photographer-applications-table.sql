-- Create photographer_applications table
CREATE TABLE IF NOT EXISTS photographer_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    cameras TEXT[] DEFAULT '{}',
    location TEXT,
    portfolio_link TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE photographer_applications ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can insert (to apply)
CREATE POLICY "Anyone can submit an application" ON photographer_applications
    FOR INSERT WITH CHECK (true);

-- Policy: Only admins can view/manage
-- Replace 'admin@thelostandunfounds.com' and 'thelostandunfounds@gmail.com' with logic if needed, 
-- but for simplicity we rely on service role or admin check in UI/API
CREATE POLICY "Admins can manage applications" ON photographer_applications
    FOR ALL USING (
        auth.jwt() ->> 'email' IN ('admin@thelostandunfounds.com', 'thelostandunfounds@gmail.com')
    );

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_photographer_applications_updated_at ON photographer_applications;
CREATE TRIGGER update_photographer_applications_updated_at
    BEFORE UPDATE ON photographer_applications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
