CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"recipient_id" uuid NOT NULL,
	"actor_id" uuid NOT NULL,
	"type" text NOT NULL,
	"post_id" uuid,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notifications_event_unique" UNIQUE NULLS NOT DISTINCT("recipient_id","actor_id","type","post_id")
);
--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_id_actors_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."actors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_actor_id_actors_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."actors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "notifications_recipient_id_id_index" ON "notifications" USING btree ("recipient_id","id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "notifications_unread_index" ON "notifications" USING btree ("recipient_id") WHERE "notifications"."read_at" is null;