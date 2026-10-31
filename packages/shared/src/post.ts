import { z } from 'zod';

export const POST_LIMITS = {
  /** Same limit as Facebook. Counted on the Markdown source (docs/adr/0003-modelo-de-conteudo.md). */
  content: 63_206,
  title: 200,
  /** Hashtags beyond this still render as links but are not indexed. */
  tags: 30,
} as const;

const graphemes = new Intl.Segmenter();

/** Counts characters the way people see them: an emoji or accented letter counts once. */
export function characterCount(text: string): number {
  return Array.from(graphemes.segment(text)).length;
}

export const postContentSchema = z
  .string()
  .trim()
  .min(1)
  // Cheap guard before counting: a character takes at most two UTF-16 units.
  .max(POST_LIMITS.content * 2)
  .refine((value) => characterCount(value) <= POST_LIMITS.content, {
    message: `Posts can have at most ${POST_LIMITS.content} characters`,
  });

export const postInputSchema = z.object({
  title: z.string().trim().max(POST_LIMITS.title).nullish(),
  content: postContentSchema,
});

export type PostInput = z.infer<typeof postInputSchema>;
