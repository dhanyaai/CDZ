ALTER TABLE "status_history" ADD COLUMN IF NOT EXISTS "reason" text;
--> statement-breakpoint
ALTER TABLE "status_history" ADD COLUMN IF NOT EXISTS "reason_note" text;
