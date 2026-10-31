import { schema, type Executor } from '@social-dev/db';
import { inArray } from '@social-dev/db/orm';

const { tags } = schema;

/**
 * Creates the tags that do not exist yet and returns the ids of all of them, in the order
 * given. Names must already be normalized and unique.
 */
export async function upsertTags(db: Executor, names: string[]): Promise<string[]> {
  if (names.length === 0) return [];

  await db
    .insert(tags)
    .values(names.map((name) => ({ name })))
    .onConflictDoNothing();
  const rows = await db
    .select({ id: tags.id, name: tags.name })
    .from(tags)
    .where(inArray(tags.name, names));
  const idByName = new Map(rows.map((tag) => [tag.name, tag.id]));

  return names.map((name) => {
    const id = idByName.get(name);
    if (!id) throw new Error(`tag ${name} was not created`);
    return id;
  });
}
