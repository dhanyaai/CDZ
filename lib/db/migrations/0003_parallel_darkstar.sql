ALTER TABLE "opportunities" ALTER COLUMN "stage" SET DEFAULT 'enquiry';--> statement-breakpoint
UPDATE "opportunities" SET "stage" = CASE "stage"
  WHEN 'prospect' THEN 'enquiry'
  WHEN 'qualified' THEN 'sent_catalogue'
  WHEN 'proposal' THEN 'samples'
  WHEN 'negotiation' THEN 'shortlisted'
  WHEN 'negotiate' THEN 'shortlisted'
  WHEN 'closed_won' THEN 'quotation_sent'
  WHEN 'closed_lost' THEN 'quotation_sent'
  WHEN 'won' THEN 'quotation_sent'
  WHEN 'lost' THEN 'quotation_sent'
  ELSE "stage" END
WHERE "stage" NOT IN ('enquiry', 'sent_catalogue', 'samples', 'shortlisted', 'quotation_sent');