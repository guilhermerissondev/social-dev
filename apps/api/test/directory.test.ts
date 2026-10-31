import { afterAll, describe, expect, inject, it } from 'vitest';

import { buildTestApp, createSignedInUser, sendJson, uniqueSuffix } from './helpers.ts';

const context = buildTestApp(inject('databaseUrl'));
const { app } = context;

afterAll(context.close);

interface Entry {
  username: string;
  area: string | null;
  seniority: string | null;
  location: string;
  technologies: string[];
  followersCount: number;
}

const baseProfile = {
  displayName: 'Dev',
  bio: '',
  location: '',
  links: [],
  technologies: [] as string[],
};

async function createDev(profile: Partial<typeof baseProfile> & Record<string, unknown>) {
  const user = await createSignedInUser(context);
  const res = await sendJson(
    app,
    'PUT',
    '/api/me/profile',
    { ...baseProfile, ...profile },
    user.cookie,
  );
  expect(res.status).toBe(200);
  return user;
}

async function directory(query: Record<string, string>) {
  const res = await app.request(`/api/directory?${new URLSearchParams(query).toString()}`);
  expect(res.status).toBe(200);
  return (await res.json()) as { items: Entry[]; nextCursor: string | null };
}

describe('profile area and seniority', () => {
  it('saves them and rejects unknown values', async () => {
    const user = await createDev({ area: 'backend', seniority: 'senior' });
    const res = await app.request(`/api/profiles/${user.username}`);
    expect(await res.json()).toMatchObject({ area: 'backend', seniority: 'senior' });

    const invalid = await sendJson(
      app,
      'PUT',
      '/api/me/profile',
      { ...baseProfile, area: 'wizardry' },
      user.cookie,
    );
    expect(invalid.status).toBe(400);
  });
});

describe('GET /api/directory', () => {
  it('combines technology, area, seniority and location filters', async () => {
    const tech = `lang_${uniqueSuffix()}`;
    const match = await createDev({
      technologies: [tech, 'postgresql'],
      area: 'backend',
      seniority: 'senior',
      location: 'São Paulo, SP',
    });
    await createDev({
      technologies: [tech],
      area: 'frontend',
      seniority: 'senior',
      location: 'São Paulo',
    });
    await createDev({
      technologies: [tech],
      area: 'backend',
      seniority: 'junior',
      location: 'São Paulo',
    });
    await createDev({
      technologies: [tech],
      area: 'backend',
      seniority: 'senior',
      location: 'Recife',
    });

    const { items } = await directory({
      tech,
      area: 'backend',
      seniority: 'senior',
      // No accent, different case.
      location: 'sao paulo',
    });
    expect(items).toEqual([
      expect.objectContaining({
        username: match.username,
        location: 'São Paulo, SP',
        technologies: [tech, 'postgresql'],
      }),
    ]);
  });

  it('lists the most followed first', async () => {
    const tech = `lang_${uniqueSuffix()}`;
    const quiet = await createDev({ technologies: [tech] });
    const popular = await createDev({ technologies: [tech] });
    const fan = await createSignedInUser(context);
    await sendJson(app, 'POST', `/api/profiles/${popular.username}/follow`, undefined, fan.cookie);

    const { items } = await directory({ tech: `#${tech.toUpperCase()}` });
    expect(items.map((entry) => [entry.username, entry.followersCount])).toEqual([
      [popular.username, 1],
      [quiet.username, 0],
    ]);
  });

  it('matches nobody for invalid filters', async () => {
    expect((await directory({ tech: 'c++' })).items).toEqual([]);
    expect((await app.request('/api/directory?area=wizardry')).status).toBe(400);
  });
});
