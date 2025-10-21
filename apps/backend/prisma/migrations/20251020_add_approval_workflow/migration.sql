-- CreateEnum for AreaRole (if not exists)
DO $$ BEGIN
 CREATE TYPE "area_role" AS ENUM ('VIEWER', 'MANAGER', 'ADMIN');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- CreateEnum for ApprovalAction (if not exists)
DO $$ BEGIN
 CREATE TYPE "approval_action" AS ENUM ('APPROVED', 'REJECTED', 'COMMENT', 'EDITED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Add area_role column to user_areas table if it doesn't exist
DO $$ BEGIN
 ALTER TABLE "user_areas" ADD COLUMN "area_role" "area_role" NOT NULL DEFAULT 'MANAGER';
EXCEPTION
 WHEN duplicate_column THEN null;
END $$;

-- Add approval tracking columns to movements table if they don't exist
DO $$ BEGIN
 ALTER TABLE "movements" ADD COLUMN "approved_by" UUID;
EXCEPTION
 WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "movements" ADD COLUMN "approved_at" TIMESTAMP(3);
EXCEPTION
 WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "movements" ADD COLUMN "rejected_by" UUID;
EXCEPTION
 WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "movements" ADD COLUMN "rejected_at" TIMESTAMP(3);
EXCEPTION
 WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "movements" ADD COLUMN "rejection_reason" TEXT;
EXCEPTION
 WHEN duplicate_column THEN null;
END $$;

-- CreateTable movement_approvals (if not exists)
CREATE TABLE IF NOT EXISTS "movement_approvals" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "movement_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "action" "approval_action" NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movement_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "movement_approvals_movement_id_idx" ON "movement_approvals"("movement_id");
CREATE INDEX IF NOT EXISTS "movement_approvals_user_id_idx" ON "movement_approvals"("user_id");
CREATE INDEX IF NOT EXISTS "movement_approvals_created_at_idx" ON "movement_approvals"("created_at");

-- AddForeignKey (if not exists)
DO $$ BEGIN
 ALTER TABLE "movements" ADD CONSTRAINT "movements_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "movements" ADD CONSTRAINT "movements_rejected_by_fkey" FOREIGN KEY ("rejected_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "movement_approvals" ADD CONSTRAINT "movement_approvals_movement_id_fkey" FOREIGN KEY ("movement_id") REFERENCES "movements"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "movement_approvals" ADD CONSTRAINT "movement_approvals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
