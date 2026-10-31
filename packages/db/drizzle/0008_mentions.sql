CREATE TABLE "post_mentions" (
	"post_id" uuid NOT NULL,
	"actor_id" uuid NOT NULL,
	CONSTRAINT "post_mentions_post_id_actor_id_pk" PRIMARY KEY("post_id","actor_id")
);
--> statement-breakpoint
ALTER TABLE "post_mentions" ADD CONSTRAINT "post_mentions_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_mentions" ADD CONSTRAINT "post_mentions_actor_id_actors_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."actors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "post_mentions_actor_id_index" ON "post_mentions" USING btree ("actor_id");