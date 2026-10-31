ALTER TABLE "users" ADD COLUMN "onboarding_completed_at" timestamp with time zone;--> statement-breakpoint
-- Accounts created before onboarding existed are already set up.
UPDATE "users" SET "onboarding_completed_at" = "created_at";
