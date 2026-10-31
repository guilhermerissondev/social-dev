CREATE TABLE "github_profiles" (
	"actor_id" uuid PRIMARY KEY NOT NULL,
	"login" text NOT NULL,
	"pinned_repos" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"show_on_profile" boolean DEFAULT true NOT NULL,
	"fetched_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "github_profiles" ADD CONSTRAINT "github_profiles_actor_id_actors_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."actors"("id") ON DELETE cascade ON UPDATE no action;