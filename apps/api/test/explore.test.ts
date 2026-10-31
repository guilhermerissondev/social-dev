import { schema } from '@social-dev/db';
import { eq } from '@social-dev/db/orm';
import { afterAll, describe, expect, inject, it } from 'vitest';

import { EXPLORE_PAGE_SIZE } from '../src/modules/explore/service.ts';
import { buildTestApp, createSignedInUser, sendJson, uniqueSuffix } from './helpers.ts';

const context = buildTestApp(inject('databaseUrl'));
const { app } = context;

afterAll(context.close);

interface Page {
  items: { id: string; content: string }[];
  nextCursor: string | null;
}

async function publish(cookie: string, content: string, replyToId?: string) {
  const res = await sendJson(app, 'POST', '/api/posts', { content, replyToId }, cookie);
  return ((await res.json()) as { id: string }).id;
}

async function explore(query: string) {
  return (await (await app.request(`/api/explore/posts?${query}`)).json()) as Page;
}

// Every test posts with its own tag, so posts from other test files never get in the way.
const newTag = () => `explore_${uniqueSuffix()}`;

describe('GET /api/explore/posts', () => {
  it('ranks posts by engagement, newest first among ties', async () => {
    const ada = await createSignedInUser(context);
    const fan = await createSignedInUser(context);
    const tag = newTag();

    const liked = await publish(ada.cookie, `liked #${tag}`);
    const reposted = await publish(ada.cookie, `reposted #${tag}`);
    const quietOld = await publish(ada.cookie, `quiet old #${tag}`);
    const quietNew = await publish(ada.cookie, `quiet new #${tag}`);
    await sendJson(app, 'POST', `/api/posts/${liked}/like`, undefined, fan.cookie);
    await sendJson(app, 'POST', `/api/posts/${reposted}/repost`, undefined, fan.cookie);
    // Replies count for the post they belong to and never show up on their own.
    await publish(fan.cookie, 'a reply', liked);
    await publish(fan.cookie, 'another reply', liked);

    const page = await explore(`tag=${tag}`);
    expect(page.items.map((post) => post.id)).toEqual([liked, reposted, quietNew, quietOld]);
  });

  it('only includes posts from the chosen period', async () => {
    const ada = await createSignedInUser(context);
    const tag = newTag();
    const old = await publish(ada.cookie, `old #${tag}`);
    await context.db
      .update(schema.posts)
      .set({ createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) })
      .where(eq(schema.posts.id, old));

    expect((await explore(`tag=${tag}&period=week`)).items).toEqual([]);
    expect((await explore(`tag=${tag}&period=month`)).items.map((post) => post.id)).toEqual([old]);
  });

  it('pages with the offset cursor', async () => {
    const ada = await createSignedInUser(context);
    const tag = newTag();
    for (let index = 0; index <= EXPLORE_PAGE_SIZE; index += 1) {
      await publish(ada.cookie, `#${tag} ${index}`);
    }

    const first = await explore(`tag=${tag}`);
    expect(first.items).toHaveLength(EXPLORE_PAGE_SIZE);
    const second = await explore(`tag=${tag}&cursor=${first.nextCursor ?? ''}`);
    expect(second.items).toHaveLength(1);
    expect(second.nextCursor).toBeNull();
  });

  it('rejects unknown periods and ignores invalid tags', async () => {
    expect((await app.request('/api/explore/posts?period=year')).status).toBe(400);
    expect(await explore('tag=c%2B%2B')).toEqual({ items: [], nextCursor: null });
  });
});

describe('GET /api/explore/tags', () => {
  it('lists the tags used in the most posts of the period', async () => {
    const ada = await createSignedInUser(context);
    const tag = newTag();
    for (let index = 0; index < 5; index += 1) await publish(ada.cookie, `#${tag} ${index}`);

    const res = await app.request('/api/explore/tags?period=day');
    const { items } = (await res.json()) as { items: { name: string; postsCount: number }[] };
    expect(items).toContainEqual({ name: tag, postsCount: 5 });
  });
});
