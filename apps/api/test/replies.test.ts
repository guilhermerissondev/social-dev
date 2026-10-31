import { afterAll, describe, expect, inject, it } from 'vitest';

import { buildTestApp, createSignedInUser, sendJson } from './helpers.ts';

const context = buildTestApp(inject('databaseUrl'));
const { app } = context;

afterAll(context.close);

interface Post {
  id: string;
  title: string | null;
  content: string;
  replyTo: { id: string; authorUsername: string } | null;
  threadId: string | null;
  repliesCount: number;
}

async function publish(
  cookie: string,
  body: { content: string; title?: string; replyToId?: string },
) {
  const res = await sendJson(app, 'POST', '/api/posts', body, cookie);
  expect(res.status).toBe(201);
  return (await res.json()) as Post;
}

async function thread(id: string) {
  return ((await (await app.request(`/api/posts/${id}/thread`)).json()) as { items: Post[] }).items;
}

const getPost = async (id: string) =>
  (await (await app.request(`/api/posts/${id}`)).json()) as Post;

describe('replies', () => {
  it('builds a conversation with nested replies', async () => {
    const ada = await createSignedInUser(context);
    const grace = await createSignedInUser(context);

    const root = await publish(ada.cookie, { content: 'Question?' });
    const answer = await publish(grace.cookie, {
      content: 'Answer',
      replyToId: root.id,
      title: 'ignored',
    });
    const followUp = await publish(ada.cookie, { content: 'Thanks', replyToId: answer.id });

    expect(answer).toMatchObject({
      title: null,
      threadId: root.id,
      replyTo: { id: root.id, authorUsername: ada.username },
    });
    expect(followUp).toMatchObject({ threadId: root.id, replyTo: { id: answer.id } });

    expect((await thread(root.id)).map((post) => post.content)).toEqual(['Answer', 'Thanks']);
    // The root counts the whole conversation; a reply counts its direct replies.
    expect(await getPost(root.id)).toMatchObject({ repliesCount: 2 });
    expect(await getPost(answer.id)).toMatchObject({ repliesCount: 1 });
  });

  it('keeps replies out of lists and the feed', async () => {
    const ada = await createSignedInUser(context);
    const root = await publish(ada.cookie, { content: 'Top level' });
    await publish(ada.cookie, { content: 'A reply', replyToId: root.id });

    const profile = await app.request(`/api/profiles/${ada.username}/posts`);
    const feed = await sendJson(app, 'GET', '/api/feed', undefined, ada.cookie);
    for (const res of [profile, feed]) {
      const { items } = (await res.json()) as { items: Post[] };
      expect(items.map((post) => post.content)).toEqual(['Top level']);
    }
  });

  it('notifies the author of the post being answered, but not yourself', async () => {
    const ada = await createSignedInUser(context);
    const grace = await createSignedInUser(context);
    const root = await publish(ada.cookie, { content: 'Hello' });

    const reply = await publish(grace.cookie, { content: 'Hi Ada', replyToId: root.id });
    await publish(ada.cookie, { content: 'Replying to myself', replyToId: root.id });

    const res = await sendJson(app, 'GET', '/api/notifications', undefined, ada.cookie);
    const { items } = (await res.json()) as {
      items: { type: string; post: { id: string; excerpt: string } | null }[];
    };
    expect(items).toMatchObject([{ type: 'reply', post: { id: reply.id, excerpt: 'Hi Ada' } }]);
  });

  it('keeps replies when the post they answer is deleted', async () => {
    const ada = await createSignedInUser(context);
    const grace = await createSignedInUser(context);
    const root = await publish(ada.cookie, { content: 'Root' });
    const answer = await publish(grace.cookie, { content: 'Answer', replyToId: root.id });
    const nested = await publish(ada.cookie, { content: 'Nested', replyToId: answer.id });

    await sendJson(app, 'DELETE', `/api/posts/${answer.id}`, undefined, grace.cookie);

    // The nested reply loses its parent but stays in the conversation.
    expect(await getPost(nested.id)).toMatchObject({ replyTo: null, threadId: root.id });
    expect((await thread(root.id)).map((post) => post.content)).toEqual(['Nested']);
  });

  it('does not let a reply gain a title when edited', async () => {
    const ada = await createSignedInUser(context);
    const root = await publish(ada.cookie, { content: 'Root' });
    const reply = await publish(ada.cookie, { content: 'Reply', replyToId: root.id });

    await sendJson(
      app,
      'PUT',
      `/api/posts/${reply.id}`,
      { content: 'Edited', title: 'No' },
      ada.cookie,
    );
    await sendJson(
      app,
      'PUT',
      `/api/posts/${root.id}`,
      { content: 'Root', title: 'Yes' },
      ada.cookie,
    );
    expect(await getPost(reply.id)).toMatchObject({ content: 'Edited', title: null });
    expect(await getPost(root.id)).toMatchObject({ title: 'Yes' });
  });

  it('rejects replies to posts that do not exist', async () => {
    const ada = await createSignedInUser(context);
    const res = await sendJson(
      app,
      'POST',
      '/api/posts',
      { content: 'Hello?', replyToId: crypto.randomUUID() },
      ada.cookie,
    );
    expect(res.status).toBe(404);
  });
});
