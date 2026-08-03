CREATE TABLE IF NOT EXISTS "status_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer DEFAULT 1 NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" integer NOT NULL,
	"from_status" text,
	"to_status" text NOT NULL,
	"changed_by" integer,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "status_history" ADD CONSTRAINT "status_history_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "status_history" ADD CONSTRAINT "status_history_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "status_history_entity_idx" ON "status_history" ("company_id","entity_type","entity_id");
