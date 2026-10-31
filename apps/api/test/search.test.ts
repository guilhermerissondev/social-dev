import { afterAll, describe, expect, inject, it } from 'vitest';

import { buildTestApp, createSignedInUser, sendJson, uniqueSuffix } from './helpers.ts';

const context = buildTestApp(inject('databaseUrl'));
const { app } = context;

afterAll(context.close);

interface Results {
  people: { username: string; displayName: string }[];
  tags: { name: string; postsCount: number }[];
  posts: { items: { id: string; content: string }[]; nextCursor: string | null };
}

async function search(query: Record<string, string>) {
  const res = await app.request(`/api/search?${new URLSearchParams(query).toString()}`);
  expect(res.status).toBe(200);
  return (await res.json()) as Results;
}

async function publish(cookie: string, content: string, title?: string) {
  const res = await sendJson(app, 'POST', '/api/posts', { content, title }, cookie);
  return ((await res.json()) as { id: string }).id;
}

describe('searching posts', () => {
  it('matches words in Portuguese, ignoring accents and inflections', async () => {
    const ada = await createSignedInUser(context);
    const word = `zyx${uniqueSuffix()}`;
    const post = await publish(ada.cookie, `Programação com componentes em Elixir ${word}`);

    // No accent, and the singular of "componentes".
    const { posts } = await search({ q: `programacao componente ${word}`, type: 'posts' });
    expect(posts.items.map((item) => item.id)).toEqual([post]);
  });

  it('ranks title matches above content matches', async () => {
    const ada = await createSignedInUser(context);
    const word = `kotlin${uniqueSuffix()}`;
    const inContent = await publish(ada.cookie, `Some notes mentioning ${word} once`);
    const inTitle = await publish(ada.cookie, 'Notes', `${word} in depth`);

    const { posts } = await search({ q: word, type: 'posts' });
    expect(posts.items.map((item) => item.id)).toEqual([inTitle, inContent]);
  });

  it('supports exact phrases and exclusions', async () => {
    const ada = await createSignedInUser(context);
    const word = `qwe${uniqueSuffix()}`;
    const wanted = await publish(ada.cookie, `${word} type safety matters`);
    await publish(ada.cookie, `${word} safety of types and runtime`);

    const phrase = await search({ q: `${word} "type safety"`, type: 'posts' });
    expect(phrase.posts.items.map((item) => item.id)).toEqual([wanted]);
    const excluded = await search({ q: `${word} -runtime`, type: 'posts' });
    expect(excluded.posts.items.map((item) => item.id)).toEqual([wanted]);
  });
});

describe('searching people', () => {
  it('finds accounts by part of the username or name, exact username first', async () => {
    const suffix = uniqueSuffix();
    const exact = await createSignedInUser(context, { username: `dev_${suffix}` });
    const longer = await createSignedInUser(context, { username: `dev_${suffix}_2` });

    const { people } = await search({ q: `@dev_${suffix}`, type: 'people' });
    expect(people.map((person) => person.username)).toEqual([exact.username, longer.username]);

    // Names created by the helper are "Grace <suffix>".
    const byName = await search({ q: exact.name.toLowerCase(), type: 'people' });
    expect(byName.people.map((person) => person.username)).toEqual([exact.username]);
  });

  it('treats LIKE wildcards literally', async () => {
    const { people } = await search({ q: '%%', type: 'people' });
    expect(people).toEqual([]);
  });
});

describe('searching tags and everything at once', () => {
  it('finds tags by prefix and returns all kinds together', async () => {
    const ada = await createSignedInUser(context);
    const tag = `searchable_${uniqueSuffix()}`;
    const post = await publish(ada.cookie, `About #${tag}`);

    const results = await search({ q: `#${tag.slice(0, 15)}` });
    expect(results.tags).toContainEqual({ name: tag, postsCount: 1 });

    const all = await search({ q: tag });
    expect(all.posts.items.map((item) => item.id)).toEqual([post]);
  });

  it('rejects queries that are too short', async () => {
    expect((await app.request('/api/search?q=a')).status).toBe(400);
  });
});
