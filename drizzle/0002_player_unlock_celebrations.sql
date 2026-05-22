CREATE TABLE "player_unlock_celebrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_id" uuid NOT NULL,
	"level" smallint NOT NULL,
	"celebrated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "player_unlock_celebrations" ADD CONSTRAINT "player_unlock_celebrations_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "player_unlock_celebrations_player_level" ON "player_unlock_celebrations" USING btree ("player_id","level");
