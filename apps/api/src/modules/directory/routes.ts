import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { AREAS, normalizeTag, SENIORITIES } from '@social-dev/shared';

import type { AppEnv } from '../../app.ts';
import { listDirectory } from './service.ts';

const DirectoryEntrySchema = z
  .object({
    id: z.uuid(),
    username: z.string(),
    displayName: z.string(),
    bio: z.string(),
    avatarUrl: z.string().nullable(),
    area: z.enum(AREAS).nullable(),
    seniority: z.enum(SENIORITIES).nullable(),
    location: z.string(),
    technologies: z.array(z.string()).openapi({ description: 'The first few, in profile order' }),
    followersCount: z.number().int(),
  })
  .openapi('DirectoryEntry');

const route = createRoute({
  method: 'get',
  path: '/api/directory',
  tags: ['Directory'],
  summary: 'Find people by technology, area, seniority and location',
  request: {
    query: z.object({
      tech: z.string().optional(),
      area: z.enum(AREAS).optional(),
      seniority: z.enum(SENIORITIES).optional(),
      location: z.string().max(60).optional(),
      cursor: z.string().optional(),
    }),
  },
  responses: {
    200: {
      description: 'Matching people, most followed first',
      content: {
        'application/json': {
          schema: z.object({
            items: z.array(DirectoryEntrySchema),
            nextCursor: z.string().nullable(),
          }),
        },
      },
    },
  },
});

export const directoryRoutes = new OpenAPIHono<AppEnv>().openapi(route, async (c) => {
  const { tech, cursor, ...filters } = c.req.valid('query');
  // An invalid technology name matches nobody.
  const techName = tech === undefined ? undefined : normalizeTag(tech);
  if (techName === null) return c.json({ items: [], nextCursor: null }, 200);

  return c.json(await listDirectory(c.var.deps.db, { ...filters, tech: techName }, cursor), 200);
});
