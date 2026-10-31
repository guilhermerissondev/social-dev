import { afterAll, describe, expect, inject, it } from 'vitest';

import { buildTestApp, createSignedInUser, sendJson } from './helpers.ts';

const context = buildTestApp(inject('databaseUrl'));
const { app } = context;

afterAll(context.close);

interface Notification {
  id: string;
  type: string;
  read: boolean;
  actor: { username: string };
  post: { id: string; excerpt: string; authorUsername: string } | null;
}

async function notifications(cookie: string) {
  const res = await sendJson(app, 'GET', '/api/notifications', undefined, cookie);
  expect(res.status).toBe(200);
  return ((await res.json()) as { items: Notification[] }).items;
}

async function unread(cookie: string) {
  const res = await sendJson(app, 'GET', '/api/notifications/unread-count', undefined, cookie);
  return ((await res.json()) as { count: number }).count;
}

async function publish(cookie: string, content: string) {
  const res = await sendJson(app, 'POST', '/api/posts', { content }, cookie);
  return ((await res.json()) as { id: string }).id;
}

describe('notifications', () => {
  it('notifies new followers and likes, newest first', async () => {
    const ada = await createSignedInUser(context);
    const grace = await createSignedInUser(context);
    const postId = await publish(ada.cookie, '**Analytical** engine notes');

    await sendJson(app, 'POST', `/api/profiles/${ada.username}/follow`, undefined, grace.cookie);
    await sendJson(app, 'POST', `/api/posts/${postId}/like`, undefined, grace.cookie);

    expect(await notifications(ada.cookie)).toMatchObject([
      {
        type: 'like',
        read: false,
        actor: { username: grace.username },
        post: { id: postId, excerpt: 'Analytical engine notes', authorUsername: ada.username },
      },
      { type: 'follow', read: false, actor: { username: grace.username }, post: null },
    ]);
    expect(await unread(ada.cookie)).toBe(2);
    expect(await notifications(grace.cookie)).toEqual([]);
  });

  it('does not notify twice, and undoing the action removes the notification', async () => {
    const ada = await createSignedInUser(context);
    const grace = await createSignedInUser(context);
    const postId = await publish(ada.cookie, 'hello');

    for (let index = 0; index < 2; index += 1) {
      await sendJson(app, 'POST', `/api/posts/${postId}/like`, undefined, grace.cookie);
    }
    expect(await unread(ada.cookie)).toBe(1);

    await sendJson(app, 'DELETE', `/api/posts/${postId}/like`, undefined, grace.cookie);
    await sendJson(app, 'POST', `/api/profiles/${ada.username}/follow`, undefined, grace.cookie);
    await sendJson(app, 'DELETE', `/api/profiles/${ada.username}/follow`, undefined, grace.cookie);
    expect(await notifications(ada.cookie)).toEqual([]);
  });

  it('never notifies people about their own actions or about saves', async () => {
    const ada = await createSignedInUser(context);
    const grace = await createSignedInUser(context);
    const postId = await publish(ada.cookie, 'hello');

    await sendJson(app, 'POST', `/api/posts/${postId}/like`, undefined, ada.cookie);
    await sendJson(app, 'POST', `/api/posts/${postId}/bookmark`, undefined, grace.cookie);
    expect(await notifications(ada.cookie)).toEqual([]);
  });

  it('marks notifications read up to the newest one seen', async () => {
    const ada = await createSignedInUser(context);
    const grace = await createSignedInUser(context);
    const linus = await createSignedInUser(context);

    await sendJson(app, 'POST', `/api/profiles/${ada.username}/follow`, undefined, grace.cookie);
    const [seen] = await notifications(ada.cookie);
    // Arrives after the page was loaded, so it stays unread.
    await sendJson(app, 'POST', `/api/profiles/${ada.username}/follow`, undefined, linus.cookie);

    const res = await sendJson(
      app,
      'POST',
      '/api/notifications/read',
      { upTo: seen?.id },
      ada.cookie,
    );
    expect(res.status).toBe(204);
    expect(await unread(ada.cookie)).toBe(1);
    expect((await notifications(ada.cookie)).map((item) => item.read)).toEqual([false, true]);
  });

  it('removes notifications about deleted posts', async () => {
    const ada = await createSignedInUser(context);
    const grace = await createSignedInUser(context);
    const postId = await publish(ada.cookie, 'temporary');
    await sendJson(app, 'POST', `/api/posts/${postId}/like`, undefined, grace.cookie);

    await sendJson(app, 'DELETE', `/api/posts/${postId}`, undefined, ada.cookie);
    expect(await notifications(ada.cookie)).toEqual([]);
  });

  it('requires a session', async () => {
    expect((await app.request('/api/notifications')).status).toBe(401);
    expect((await app.request('/api/notifications/unread-count')).status).toBe(401);
  });
});
