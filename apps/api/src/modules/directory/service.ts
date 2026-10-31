import { schema, type Database } from '@social-dev/db';
import { and, asc, desc, eq, exists, inArray, isNull, sql } from '@social-dev/db/orm';
import type { Area, Seniority } from '@social-dev/shared';

const { actors, actorTechnologies, follows, tags, users } = schema;

export const DIRECTORY_PAGE_SIZE = 30;
/** Technologies shown on each directory card. */
const CARD_TECHNOLOGIES = 5;

export interface DirectoryFilters {
  /** Normalized tag name. */
  tech?: string | undefined;
  area?: Area | undefined;
  seniority?: Seniority | undefined;
  /** Part of the location, ignoring case and accents ("sao paulo" finds "São Paulo"). */
  location?: string | undefined;
}

export interface DirectoryEntry {
  id: string;
  username: string;
  displayName: string;
  bio: string;
  avatarUrl: string | null;
  area: Area | null;
  seniority: Seniority | null;
  location: string;
  technologies: string[];
  followersCount: number;
}

/** Escapes LIKE wildcards so they match literally. */
function escapeLike(text: string): string {
  return text.replace(/[\\%_]/g, (char) => `\\${char}`);
}

/**
 * Local accounts matching every given filter, most followed first. Paged by offset; the
 * cursor is the offset of the next page.
 */
export async function listDirectory(
  db: Database,
  filters: DirectoryFilters,
  cursor?: string,
): Promise<{ items: DirectoryEntry[]; nextCursor: string | null }> {
  const offset = Math.max(0, Number.parseInt(cursor ?? '0', 10) || 0);
  const followersCount = sql<number>`(select count(*) from ${follows} where ${follows.followeeId} = ${actors.id})::int`;
  const location = filters.location?.trim();

  const rows = await db
    .select({
      id: actors.id,
      username: actors.username,
      displayName: actors.displayName,
      bio: actors.bio,
      avatarUrl: users.image,
      area: actors.area,
      seniority: actors.seniority,
      location: actors.location,
      followersCount,
    })
    .from(actors)
    .leftJoin(users, eq(users.id, actors.userId))
    .where(
      and(
        isNull(actors.domain),
        filters.tech
          ? exists(
              sql`(select 1 from ${actorTechnologies} inner join ${tags} on ${tags.id} = ${actorTechnologies.tagId}
                where ${actorTechnologies.actorId} = ${actors.id} and ${tags.name} = ${filters.tech})`,
            )
          : undefined,
        filters.area ? eq(actors.area, filters.area) : undefined,
        filters.seniority ? eq(actors.seniority, filters.seniority) : undefined,
        location
          ? sql`unaccent(lower(${actors.location})) like unaccent(lower(${`%${escapeLike(location)}%`}))`
          : undefined,
      ),
    )
    .orderBy(desc(followersCount), asc(actors.username))
    .offset(offset)
    .limit(DIRECTORY_PAGE_SIZE + 1);

  const page = rows.slice(0, DIRECTORY_PAGE_SIZE);
  const technologies =
    page.length > 0
      ? await db
          .select({ actorId: actorTechnologies.actorId, name: tags.name })
          .from(actorTechnologies)
          .innerJoin(tags, eq(tags.id, actorTechnologies.tagId))
          .where(
            inArray(
              actorTechnologies.actorId,
              page.map((row) => row.id),
            ),
          )
          .orderBy(actorTechnologies.position)
      : [];
  const byActor = new Map<string, string[]>();
  for (const { actorId, name } of technologies) {
    byActor.set(actorId, [...(byActor.get(actorId) ?? []), name]);
  }

  return {
    items: page.map((row) => ({
      ...row,
      technologies: (byActor.get(row.id) ?? []).slice(0, CARD_TECHNOLOGIES),
    })),
    nextCursor: rows.length > DIRECTORY_PAGE_SIZE ? String(offset + DIRECTORY_PAGE_SIZE) : null,
  };
}
