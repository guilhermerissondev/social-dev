import { z } from 'zod';

const cursorSchema = z.object({ at: z.iso.datetime(), id: z.uuid() });

/** Position in a list ordered by (timestamp, id), newest first. */
export type Cursor = z.infer<typeof cursorSchema>;

export function encodeCursor(cursor: Cursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString('base64url');
}

/** Returns null for anything that is not a cursor this API produced. */
export function decodeCursor(value: string): Cursor | null {
  try {
    const result = cursorSchema.safeParse(JSON.parse(Buffer.from(value, 'base64url').toString()));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}
