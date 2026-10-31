import { afterAll, describe, expect, inject, it } from 'vitest';

import { buildTestApp, createSignedInUser, sendJson } from './helpers.ts';

const context = buildTestApp(inject('databaseUrl'));
const { app } = context;

afterAll(context.close);

interface Notification {
  type: string;
  actor: { username: string };
  post: { id: string } | null;
}

async function publish(cookie: string, body: { content: string; replyToId?: string }) {
  const res = await sendJson(app, 'POST', '/api/posts', body, cookie);
  expect(res.status).toBe(201);
  return (await res.json()) as { id: string; contentHtml: string };
}

async function notifications(cookie: string) {
  const res = await sendJson(app, 'GET', '/api/notifications', undefined, cookie);
  return ((await res.json()) as { items: Notification[] }).items;
}

describe('mentions', () => {
  it('links and notifies mentioned accounts that exist', async () => {
    const ada = await createSignedInUser(context);
    const grace = await createSignedInUser(context);

    const post = await publish(ada.cookie, {
      content: `Hey @${grace.username.toUpperCase()}, meet @nobody_at_all`,
    });
    expect(post.contentHtml).toContain(
      `<a href="/@${grace.username}" class="mention">@${grace.username.toUpperCase()}</a>`,
    );
    expect(post.contentHtml).toContain('meet @nobody_at_all');

    expect(await notifications(grace.cookie)).toMatchObject([
      { type: 'mention', actor: { username: ada.username }, post: { id: post.id } },
    ]);
  });

  it('notifies on edit only people who were not mentioned before', async () => {
    const ada = await createSignedInUser(context);
    const grace = await createSignedInUser(context);
    const linus = await createSignedInUser(context);
    const post = await publish(ada.cookie, { content: `cc @${grace.username}` });

    const edit = (content: string) =>
      sendJson(app, 'PUT', `/api/posts/${post.id}`, { content }, ada.cookie);
    await edit(`cc @${grace.username} @${linus.username}`);
    expect(await notifications(grace.cookie)).toHaveLength(1);
    expect(await notifications(linus.cookie)).toHaveLength(1);

    // Removing a mention removes its notification.
    await edit(`cc @${linus.username}`);
    expect(await notifications(grace.cookie)).toEqual([]);
  });

  it('does not notify yourself or send a mention on top of a reply notification', async () => {
    const ada = await createSignedInUser(context);
    const grace = await createSignedInUser(context);
    const root = await publish(ada.cookie, { content: `Note to self @${ada.username}` });
    expect(await notifications(ada.cookie)).toEqual([]);

    await publish(grace.cookie, { content: `@${ada.username} agreed`, replyToId: root.id });
    expect((await notifications(ada.cookie)).map((item) => item.type)).toEqual(['reply']);
  });

  it('renders mentions in the preview', async () => {
    const ada = await createSignedInUser(context);
    const res = await sendJson(
      app,
      'POST',
      '/api/posts/preview',
      { content: `@${ada.username}` },
      ada.cookie,
    );
    expect(await res.json()).toMatchObject({
      html: expect.stringContaining('class="mention"') as unknown,
    });
  });
});
