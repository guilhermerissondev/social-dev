import { z } from 'zod';

export const TAG_MAX_LENGTH = 50;

// Same rule as fediverse hashtags: letters, digits and underscore, so a tag federates as-is.
const TAG_PATTERN = /^[\p{L}\p{N}_]+$/u;

/**
 * Normalizes a tag name ("#TypeScript" -> "typescript"). Returns null when the name is not a
 * valid tag, so callers can reject it.
 */
export function normalizeTag(input: string): string | null {
  const name = input.trim().replace(/^#/, '').normalize('NFKC').toLowerCase();
  if (name.length === 0 || name.length > TAG_MAX_LENGTH || !TAG_PATTERN.test(name)) return null;
  return name;
}

/** Accepts any spelling that normalizes to a valid tag. Normalize with `normalizeTag` after parsing. */
export const tagSchema = z
  .string()
  .max(TAG_MAX_LENGTH + 1)
  .refine((value) => normalizeTag(value) !== null, 'Invalid tag');
