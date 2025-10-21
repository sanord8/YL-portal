-- Fix Auth Schema: Add missing fields and fix session ID type
--
-- This migration adds email verification, password reset tokens,
-- and fixes the session ID to support string-based session IDs (Lucia-style)

-- Step 1: Add missing columns to users table
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email_verify_token" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email_verify_expires" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "password_reset_token" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "password_reset_expires" TIMESTAMP(3);

-- Step 2: Add unique constraints for tokens
DO $$ BEGIN
  CREATE UNIQUE INDEX IF NOT EXISTS "users_email_verify_token_key" ON "users"("email_verify_token");
EXCEPTION
  WHEN duplicate_table THEN NULL;
END $$;

DO $$ BEGIN
  CREATE UNIQUE INDEX IF NOT EXISTS "users_password_reset_token_key" ON "users"("password_reset_token");
EXCEPTION
  WHEN duplicate_table THEN NULL;
END $$;

-- Step 3: Add indexes for token lookups
CREATE INDEX IF NOT EXISTS "users_email_verify_token_idx" ON "users"("email_verify_token");
CREATE INDEX IF NOT EXISTS "users_password_reset_token_idx" ON "users"("password_reset_token");

-- Step 4: Fix sessions table - Change ID from UUID to TEXT
-- This is needed to support Lucia-style session IDs which are strings

-- First, drop existing sessions (safer than trying to migrate UUIDs to strings)
TRUNCATE TABLE "sessions" CASCADE;

-- Drop the primary key constraint
ALTER TABLE "sessions" DROP CONSTRAINT IF EXISTS "sessions_pkey";

-- Change the column type to TEXT
ALTER TABLE "sessions" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "sessions" ALTER COLUMN "id" TYPE TEXT;

-- Re-add the primary key
ALTER TABLE "sessions" ADD PRIMARY KEY ("id");

-- Step 5: Add remember_me column to sessions
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "remember_me" BOOLEAN NOT NULL DEFAULT false;

-- Step 6: Add password_reset_token column to users if migration wasn't applied
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='password_reset_token') THEN
    ALTER TABLE "users" ADD COLUMN "password_reset_token" TEXT;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='password_reset_expires') THEN
    ALTER TABLE "users" ADD COLUMN "password_reset_expires" TIMESTAMP(3);
  END IF;
END $$;
