ALTER TABLE "posts" ADD COLUMN "reply_to_id" uuid;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "thread_id" uuid;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_reply_to_id_posts_id_fk" FOREIGN KEY ("reply_to_id") REFERENCES "public"."posts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "posts_thread_id_id_index" ON "posts" USING btree ("thread_id","id");