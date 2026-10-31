ALTER TABLE "actors" ADD COLUMN "area" text;--> statement-breakpoint
ALTER TABLE "actors" ADD COLUMN "seniority" text;--> statement-breakpoint
CREATE INDEX "actors_area_index" ON "actors" USING btree ("area");--> statement-breakpoint
CREATE INDEX "actors_seniority_index" ON "actors" USING btree ("seniority");--> statement-breakpoint
ALTER TABLE "actors" ADD CONSTRAINT "actors_area_valid" CHECK ("actors"."area" in ('frontend', 'backend', 'fullstack', 'mobile', 'data', 'ai', 'devops', 'security', 'qa', 'games', 'embedded', 'other'));--> statement-breakpoint
ALTER TABLE "actors" ADD CONSTRAINT "actors_seniority_valid" CHECK ("actors"."seniority" in ('student', 'junior', 'mid', 'senior', 'staff'));