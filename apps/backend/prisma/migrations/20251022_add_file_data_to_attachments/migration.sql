-- AlterTable: Replace url column with file_data and add thumbnail_data
-- This migration safely updates the attachments table for database file storage

-- Add new columns
ALTER TABLE "attachments" ADD COLUMN "file_data" BYTEA NOT NULL DEFAULT ''::bytea;
ALTER TABLE "attachments" ADD COLUMN "thumbnail_data" BYTEA;

-- Drop old column
ALTER TABLE "attachments" DROP COLUMN "url";

-- Remove default after creation (we want explicit file data)
ALTER TABLE "attachments" ALTER COLUMN "file_data" DROP DEFAULT;
