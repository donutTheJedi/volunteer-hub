-- Add rollcall_email_sent_at to track idempotent roll-call sends
ALTER TABLE opportunities
ADD COLUMN IF NOT EXISTS rollcall_email_sent_at timestamp with time zone; 