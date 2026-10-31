import { afterAll, describe, expect, inject, it } from 'vitest';

import { PAGE_SIZE } from '../src/modules/posts/service.ts';
import { buildTestApp, createSignedInUser, sendJson } from './helpers.ts';

const context = buildTestApp(inject('databaseUrl'));
const { app } = context;

afterAll(context.close);

interface Post {
  id: string;
  likesCount: number;
  likedByViewer: boolean;
  bookmarkedByViewer: boolean;
}

interface PostPage {
  items: Post[];
  nextCursor: string | null;
}

async function publish(cookie: string, content = 'hello') {
  const res = await sendJson(app, 'POST', '/api/posts', { content }, cookie);
  return ((await res.json()) as Post).id;
}

async function getPost(id: string, cookie?: string) {
  return (await (await sendJson(app, 'GET', `/api/posts/${id}`, undefined, cookie)).json()) as Post;
}

const act = (method: 'POST' | 'DELETE', id: string, kind: 'like' | 'bookmark', cookie?: string) =>
  sendJson(app, method, `/api/posts/${id}/${kind}`, undefined, cookie);

describe('likes', () => {
  it('likes and unlikes, counting each person once', async () => {
    const author = await createSignedInUser(context);
    const fan = await createSignedInUser(context);
    const postId = await publish(author.cookie);

    expect((await act('POST', postId, 'like', fan.cookie)).status).toBe(204);
    expect((await act('POST', postId, 'like', fan.cookie)).status).toBe(204);
    await act('POST', postId, 'like', author.cookie);

    expect(await getPost(postId, fan.cookie)).toMatchObject({ likesCount: 2, likedByViewer: true });
    expect(await getPost(postId)).toMatchObject({ likesCount: 2, likedByViewer: false });

    expect((await act('DELETE', postId, 'like', fan.cookie)).status).toBe(204);
    expect(await getPost(postId, fan.cookie)).toMatchObject({
      likesCount: 1,
      likedByViewer: false,
    });
  });

  it('shows the viewer flags in lists too', async () => {
    const author = await createSignedInUser(context);
    const postId = await publish(author.cookie);
    await act('POST', postId, 'like', author.cookie);

    const res = await sendJson(app, 'GET', '/api/feed', undefined, author.cookie);
    const page = (await res.json()) as PostPage;
    expect(page.items[0]).toMatchObject({ id: postId, likesCount: 1, likedByViewer: true });
  });

  it('rejects unknown posts and anonymous requests', async () => {
    const user = await createSignedInUser(context);
    expect((await act('POST', crypto.randomUUID(), 'like', user.cookie)).status).toBe(404);
    expect((await act('POST', crypto.randomUUID(), 'like')).status).toBe(401);
  });
});

describe('bookmarks', () => {
  it('keeps saved posts private to the person who saved them', async () => {
    const author = await createSignedInUser(context);
    const reader = await createSignedInUser(context);
    const postId = await publish(author.cookie);

    await act('POST', postId, 'bookmark', reader.cookie);
    expect(await getPost(postId, reader.cookie)).toMatchObject({ bookmarkedByViewer: true });
    expect(await getPost(postId, author.cookie)).toMatchObject({ bookmarkedByViewer: false });

    const saved = async (cookie: string) =>
      (await (
        await sendJson(app, 'GET', '/api/me/bookmarks', undefined, cookie)
      ).json()) as PostPage;
    expect((await saved(reader.cookie)).items.map((post) => post.id)).toEqual([postId]);
    expect((await saved(author.cookie)).items).toEqual([]);

    await act('DELETE', postId, 'bookmark', reader.cookie);
    expect((await saved(reader.cookie)).items).toEqual([]);
  });

  it('lists the most recently saved first, across pages', async () => {
    const user = await createSignedInUser(context);
    const ids: string[] = [];
    for (let index = 0; index <= PAGE_SIZE; index += 1) ids.push(await publish(user.cookie));
    // Save in reverse publishing order, so saving order and post order differ.
    for (const id of [...ids].reverse()) await act('POST', id, 'bookmark', user.cookie);

    const list = async (query = '') =>
      (await (
        await sendJson(app, 'GET', `/api/me/bookmarks${query}`, undefined, user.cookie)
      ).json()) as PostPage;

    const first = await list();
    expect(first.items[0]?.id).toBe(ids[0]);
    expect(first.items).toHaveLength(PAGE_SIZE);
    const second = await list(`?cursor=${first.nextCursor ?? ''}`);
    expect(second.items.map((post) => post.id)).toEqual([ids.at(-1)]);
    expect(second.nextCursor).toBeNull();
  });

  it('requires a session', async () => {
    expect((await app.request('/api/me/bookmarks')).status).toBe(401);
  });
});
