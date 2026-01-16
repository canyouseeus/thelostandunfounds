-- Add price column to photo_libraries table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'photo_libraries'
        AND column_name = 'price'
    ) THEN
        ALTER TABLE photo_libraries
        ADD COLUMN price NUMERIC(10, 2) DEFAULT 5.00;
    END IF;
END $$;
