import { z } from '@hono/zod-openapi';

const AuthorSchema = z.object({
  id: z.uuid(),
  username: z.string(),
  displayName: z.string(),
  avatarUrl: z.string().nullable(),
});

export const PostSchema = z
  .object({
    id: z.uuid(),
    title: z.string().nullable(),
    content: z.string().openapi({ description: 'Markdown source' }),
    contentHtml: z.string().openapi({ description: 'Sanitized HTML rendered from the source' }),
    author: AuthorSchema,
    createdAt: z.iso.datetime(),
    editedAt: z.iso.datetime().nullable(),
    replyTo: z
      .object({ id: z.uuid(), authorUsername: z.string() })
      .nullable()
      .openapi({ description: 'The post this one answers, if it still exists' }),
    threadId: z.uuid().nullable().openapi({
      description: 'First post of the conversation, for replies. Null for top-level posts.',
    }),
    repliesCount: z.number().int().openapi({
      description: 'Replies in the conversation (top-level posts) or direct replies (replies)',
    }),
    likesCount: z.number().int(),
    likedByViewer: z.boolean().openapi({ description: 'False when not signed in' }),
    bookmarkedByViewer: z.boolean().openapi({ description: 'False when not signed in' }),
  })
  .openapi('Post');

export const PostPageSchema = z
  .object({
    items: z.array(PostSchema),
    nextCursor: z.string().nullable().openapi({ description: 'Pass back to get the next page' }),
  })
  .openapi('PostPage');
