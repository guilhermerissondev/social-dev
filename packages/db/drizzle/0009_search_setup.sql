-- Full-text search in Portuguese that ignores accents, so "programacao" finds "programação".
-- A dedicated configuration (instead of calling unaccent() in queries) keeps
-- to_tsvector('social_dev', ...) immutable, which generated columns and indexes require.
CREATE EXTENSION IF NOT EXISTS unaccent;--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
CREATE TEXT SEARCH CONFIGURATION social_dev (COPY = portuguese);--> statement-breakpoint
ALTER TEXT SEARCH CONFIGURATION social_dev
  ALTER MAPPING FOR hword, hword_part, word WITH unaccent, portuguese_stem;
