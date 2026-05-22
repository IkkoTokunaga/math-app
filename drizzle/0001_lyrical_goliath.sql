ALTER TABLE "sessions" ALTER COLUMN "total_questions" SET DEFAULT 10;--> statement-breakpoint
ALTER TABLE "question_logs" ADD COLUMN "operand_c" smallint;