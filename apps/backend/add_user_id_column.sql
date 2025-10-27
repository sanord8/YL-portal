-- Manual migration: Add userId column to departments table
-- Only adds what's needed without recreating existing enums

-- Check if column doesn't exist, then add it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'departments'
        AND column_name = 'user_id'
    ) THEN
        ALTER TABLE departments
        ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE CASCADE;

        CREATE INDEX departments_user_id_idx ON departments(user_id);

        RAISE NOTICE 'Column user_id added successfully to departments table';
    ELSE
        RAISE NOTICE 'Column user_id already exists in departments table';
    END IF;
END $$;
