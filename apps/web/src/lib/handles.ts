import { notFound } from 'next/navigation';

/**
 * Reads the username from a `/@username` route segment. Any other segment is not a page,
 * so this calls `notFound()`.
 */
export function usernameFromSegment(segment: string): string {
  const decoded = decodeURIComponent(segment);
  if (!decoded.startsWith('@') || decoded.length < 2) notFound();
  return decoded.slice(1);
}

/** Reads a single query string value. */
export function queryValue(value: string | string[] | undefined): string | undefined {
  return typeof value === 'string' ? value : undefined;
}
