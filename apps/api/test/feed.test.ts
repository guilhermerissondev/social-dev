import { afterAll, describe, expect, inject, it } from 'vitest';

import { PAGE_SIZE } from '../src/modules/posts/service.ts';
import { buildTestApp, createSignedInUser, sendJson, uniqueSuffix } from './helpers.ts';

const context = buildTestApp(inject('databaseUrl'));
const { app } = context;

afterAll(context.close);

interface PostPage {
  items: { id: string; content: string }[];
  nextCursor: string | null;
}

async function publish(cookie: string, content: string) {
  const res = await sendJson(app, 'POST', '/api/posts', { content }, cookie);
  return ((await res.json()) as { id: string }).id;
}

async function feed(cookie: string, query = '') {
  const res = await sendJson(app, 'GET', `/api/feed${query}`, undefined, cookie);
  expect(res.status).toBe(200);
  return (await res.json()) as PostPage;
}

describe('GET /api/feed', () => {
  it('shows your posts, people you follow and tags you follow, newest first', async () => {
    const me = await createSignedInUser(context);
    const friend = await createSignedInUser(context);
    const stranger = await createSignedInUser(context);
    const tag = `feed_${uniqueSuffix()}`;

    await sendJson(app, 'POST', `/api/profiles/${friend.username}/follow`, undefined, me.cookie);
    await sendJson(app, 'POST', `/api/tags/${tag}/follow`, undefined, me.cookie);

    await publish(me.cookie, 'mine');
    await publish(friend.cookie, 'from a friend');
    await publish(stranger.cookie, 'from a stranger');
    await publish(stranger.cookie, `stranger on #${tag}`);
    // A friend's post with the tag shows up once, not twice.
    await publish(friend.cookie, `friend on #${tag}`);

    const page = await feed(me.cookie);
    expect(page.items.map((post) => post.content)).toEqual([
      `friend on #${tag}`,
      `stranger on #${tag}`,
      'from a friend',
      'mine',
    ]);
  });

  it('stops showing people after unfollowing them', async () => {
    const me = await createSignedInUser(context);
    const friend = await createSignedInUser(context);
    await sendJson(app, 'POST', `/api/profiles/${friend.username}/follow`, undefined, me.cookie);
    await publish(friend.cookie, 'hello');

    expect((await feed(me.cookie)).items).toHaveLength(1);
    await sendJson(app, 'DELETE', `/api/profiles/${friend.username}/follow`, undefined, me.cookie);
    expect((await feed(me.cookie)).items).toHaveLength(0);
  });

  it('pages with a cursor', async () => {
    const me = await createSignedInUser(context);
    const ids = [];
    for (let index = 0; index <= PAGE_SIZE; index += 1)
      ids.push(await publish(me.cookie, `#${index}`));

    const first = await feed(me.cookie);
    expect(first.items).toHaveLength(PAGE_SIZE);
    const second = await feed(me.cookie, `?before=${first.nextCursor ?? ''}`);
    expect(second).toEqual({ items: [expect.objectContaining({ id: ids[0] })], nextCursor: null });
  });

  it('requires a session and a username', async () => {
    expect((await app.request('/api/feed')).status).toBe(401);
    const user = await createSignedInUser(context, { username: null });
    const res = await sendJson(app, 'GET', '/api/feed', undefined, user.cookie);
    expect(res.status).toBe(409);
  });
});
