DROP INDEX "player_unlock_celebrations_player_level";--> statement-breakpoint
ALTER TABLE "player_unlock_celebrations" ADD COLUMN "operation" varchar(20) DEFAULT 'addition' NOT NULL;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "operation" varchar(20) DEFAULT 'addition' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "player_unlock_celebrations_player_operation_level" ON "player_unlock_celebrations" USING btree ("player_id","operation","level");