ALTER TABLE "posts" ADD COLUMN "search" "tsvector" GENERATED ALWAYS AS (setweight(to_tsvector('social_dev', coalesce("posts"."title", '')), 'A') || setweight(to_tsvector('social_dev', "posts"."content"), 'B')) STORED;--> statement-breakpoint
CREATE INDEX "actors_username_trgm_index" ON "actors" USING gin (lower("username") gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "actors_display_name_trgm_index" ON "actors" USING gin (lower("display_name") gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "posts_search_index" ON "posts" USING gin ("search");