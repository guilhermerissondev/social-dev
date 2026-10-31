CREATE TABLE "reposts" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"actor_id" uuid NOT NULL,
	"post_id" uuid NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reposts_actor_post_unique" UNIQUE("actor_id","post_id")
);
--> statement-breakpoint
ALTER TABLE "reposts" ADD CONSTRAINT "reposts_actor_id_actors_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."actors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reposts" ADD CONSTRAINT "reposts_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "reposts_post_id_index" ON "reposts" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "reposts_actor_id_id_index" ON "reposts" USING btree ("actor_id","id" DESC NULLS LAST);