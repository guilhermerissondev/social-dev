import { POST_LIMITS } from '@social-dev/shared';
import { afterAll, describe, expect, inject, it } from 'vitest';

import { buildTestApp, createSignedInUser, sendJson, uniqueSuffix } from './helpers.ts';

const context = buildTestApp(inject('databaseUrl'));
const { app } = context;

afterAll(context.close);

interface Post {
  id: string;
  title: string | null;
  content: string;
  contentHtml: string;
  author: { username: string };
  editedAt: string | null;
}

interface PostPage {
  items: Post[];
  nextCursor: string | null;
}

async function publish(cookie: string, content: string, title?: string) {
  const res = await sendJson(app, 'POST', '/api/posts', { content, title }, cookie);
  expect(res.status).toBe(201);
  return (await res.json()) as Post;
}

describe('POST /api/posts', () => {
  it('publishes Markdown as sanitized HTML', async () => {
    const user = await createSignedInUser(context);

    const post = await publish(user.cookie, '**Hello** <script>alert(1)</script>', 'First');
    expect(post).toMatchObject({
      title: 'First',
      content: '**Hello** <script>alert(1)</script>',
      contentHtml: '<p><strong>Hello</strong> &#x3C;script>alert(1)&#x3C;/script></p>',
      author: { username: user.username },
      editedAt: null,
    });

    const res = await app.request(`/api/posts/${post.id}`);
    expect(await res.json()).toEqual(post);
  });

  it('stores an empty title as no title', async () => {
    const user = await createSignedInUser(context);
    expect((await publish(user.cookie, 'hi', '')).title).toBeNull();
  });

  it('enforces the character limit', async () => {
    const user = await createSignedInUser(context);
    const content = 'a'.repeat(POST_LIMITS.content + 1);

    const res = await sendJson(app, 'POST', '/api/posts', { content }, user.cookie);
    expect(res.status).toBe(400);
  });

  it('requires a session and a username', async () => {
    expect((await sendJson(app, 'POST', '/api/posts', { content: 'hi' })).status).toBe(401);

    const user = await createSignedInUser(context, { username: null });
    const res = await sendJson(app, 'POST', '/api/posts', { content: 'hi' }, user.cookie);
    expect(res.status).toBe(409);
  });
});

describe('editing and deleting', () => {
  it('lets the author edit and delete', async () => {
    const user = await createSignedInUser(context);
    const post = await publish(user.cookie, 'draft');

    const edit = await sendJson(
      app,
      'PUT',
      `/api/posts/${post.id}`,
      { content: 'final', title: 'Done' },
      user.cookie,
    );
    expect(edit.status).toBe(200);
    expect(await edit.json()).toMatchObject({
      title: 'Done',
      contentHtml: '<p>final</p>',
      editedAt: expect.any(String) as unknown,
    });

    const remove = await sendJson(app, 'DELETE', `/api/posts/${post.id}`, undefined, user.cookie);
    expect(remove.status).toBe(204);
    expect((await app.request(`/api/posts/${post.id}`)).status).toBe(404);
  });

  it('does not let anyone else change the post', async () => {
    const author = await createSignedInUser(context);
    const other = await createSignedInUser(context);
    const post = await publish(author.cookie, 'mine');

    const edit = await sendJson(
      app,
      'PUT',
      `/api/posts/${post.id}`,
      { content: 'x' },
      other.cookie,
    );
    expect(edit.status).toBe(403);
    const remove = await sendJson(app, 'DELETE', `/api/posts/${post.id}`, undefined, other.cookie);
    expect(remove.status).toBe(403);
  });

  it('returns 404 for unknown posts and 400 for malformed ids', async () => {
    expect((await app.request(`/api/posts/${crypto.randomUUID()}`)).status).toBe(404);
    expect((await app.request('/api/posts/not-a-uuid')).status).toBe(400);
  });
});

describe('listing', () => {
  it('pages through a profile, newest first', async () => {
    const user = await createSignedInUser(context);
    for (const number of [1, 2, 3]) await publish(user.cookie, `post ${number}`);

    const list = async (query = '') => {
      const res = await app.request(`/api/profiles/${user.username.toUpperCase()}/posts${query}`);
      return (await res.json()) as PostPage;
    };

    const first = await list();
    expect(first.items.map((post) => post.content)).toEqual(['post 3', 'post 2', 'post 1']);
    expect(first.nextCursor).toBeNull();

    const cursor = first.items[0]?.id ?? '';
    const older = await list(`?before=${cursor}`);
    expect(older.items.map((post) => post.content)).toEqual(['post 2', 'post 1']);
  });

  it('lists posts by hashtag and follows edits', async () => {
    const user = await createSignedInUser(context);
    const tag = `tag_${uniqueSuffix()}`;
    const post = await publish(user.cookie, `Learning #${tag.toUpperCase()} today`);

    const byTag = async () =>
      ((await (await app.request(`/api/tags/${tag}/posts`)).json()) as PostPage).items;

    expect((await byTag()).map((item) => item.id)).toEqual([post.id]);
    expect(post.contentHtml).toContain(`<a href="/tags/${tag}" class="hashtag">`);

    await sendJson(app, 'PUT', `/api/posts/${post.id}`, { content: 'no tags now' }, user.cookie);
    expect(await byTag()).toEqual([]);
  });

  it('returns an empty page for invalid tags', async () => {
    const res = await app.request('/api/tags/c++/posts');
    expect(await res.json()).toEqual({ items: [], nextCursor: null });
  });
});

describe('POST /api/posts/preview', () => {
  it('renders Markdown without saving it', async () => {
    const user = await createSignedInUser(context);
    const res = await sendJson(app, 'POST', '/api/posts/preview', { content: '# Hi' }, user.cookie);
    expect(await res.json()).toEqual({ html: '<h1>Hi</h1>' });
  });
});
