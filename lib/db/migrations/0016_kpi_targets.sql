ALTER TABLE "company_settings" ADD COLUMN IF NOT EXISTS "kpi_targets" jsonb;
--> statement-breakpoint
ALTER TABLE "company_settings" ADD COLUMN IF NOT EXISTS "processing_targets" jsonb;
