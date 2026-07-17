ALTER TABLE "leads" ADD COLUMN "qty" integer;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "budget" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "products" text;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "delivery_time" text;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "delivery_date" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "branding" boolean;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "percentage" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "total_value" numeric(12, 2);