ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "mode" varchar(20) DEFAULT 'standard' NOT NULL;
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "time_attack_state" jsonb;
