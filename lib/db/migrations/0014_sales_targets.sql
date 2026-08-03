CREATE TABLE IF NOT EXISTS "sales_targets" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer DEFAULT 1 NOT NULL,
	"user_id" integer NOT NULL,
	"month" text NOT NULL,
	"target_leads" integer DEFAULT 0 NOT NULL,
	"target_quotes" integer DEFAULT 0 NOT NULL,
	"target_revenue" numeric(14, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sales_targets" ADD CONSTRAINT "sales_targets_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sales_targets" ADD CONSTRAINT "sales_targets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "sales_targets_company_user_month_uq" ON "sales_targets" USING btree ("company_id","user_id","month");
