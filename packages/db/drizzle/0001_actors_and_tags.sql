CREATE TABLE "actors" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"user_id" uuid,
	"username" text NOT NULL,
	"domain" text,
	"display_name" text NOT NULL,
	"bio" text DEFAULT '' NOT NULL,
	"location" text DEFAULT '' NOT NULL,
	"links" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "actors_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "actors_local_or_remote" CHECK (("actors"."domain" is null) = ("actors"."user_id" is not null))
);
--> statement-breakpoint
CREATE TABLE "actor_technologies" (
	"actor_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	"position" smallint NOT NULL,
	CONSTRAINT "actor_technologies_actor_id_tag_id_pk" PRIMARY KEY("actor_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tags_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "actors" ADD CONSTRAINT "actors_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "actor_technologies" ADD CONSTRAINT "actor_technologies_actor_id_actors_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."actors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "actor_technologies" ADD CONSTRAINT "actor_technologies_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "actors_local_username_unique" ON "actors" USING btree (lower("username")) WHERE "actors"."domain" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "actors_remote_username_unique" ON "actors" USING btree (lower("username"),"domain") WHERE "actors"."domain" is not null;--> statement-breakpoint
CREATE INDEX "actor_technologies_tag_id_index" ON "actor_technologies" USING btree ("tag_id");