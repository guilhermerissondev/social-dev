import { describe, expect, it } from 'vitest';

import { createGitHubClient, GitHubError } from '../src/github/client.ts';

/** A fetch that answers from a table of paths, recording the requests. */
function fakeFetch(routes: Record<string, unknown>, status = 200) {
  const calls: { url: string; headers: Headers }[] = [];
  const fetch: typeof globalThis.fetch = (input, init) => {
    const url = input instanceof Request ? input.url : input.toString();
    calls.push({ url, headers: new Headers(init?.headers) });
    const { pathname, search } = new URL(url);
    return Promise.resolve(Response.json(routes[pathname + search] ?? null, { status }));
  };
  return { fetch, calls };
}

const repo = {
  name: 'compiler',
  nameWithOwner: 'grace/compiler',
  description: 'A-0',
  url: 'https://github.com/grace/compiler',
  stargazerCount: 42,
  primaryLanguage: { name: 'COBOL', color: '#ff0000' },
};

describe('createGitHubClient', () => {
  it('reads the login and pinned repositories, skipping gists and unsafe values', async () => {
    const { fetch, calls } = fakeFetch({
      '/graphql': {
        data: {
          viewer: {
            login: 'grace',
            pinnedItems: {
              nodes: [
                repo,
                {},
                { ...repo, name: 'odd', primaryLanguage: { name: 'X', color: 'red;}' } },
              ],
            },
          },
        },
      },
    });
    const client = createGitHubClient({ fetch });

    const viewer = await client.viewer('token-1');
    expect(viewer).toEqual({
      login: 'grace',
      pinnedRepos: [
        {
          name: 'compiler',
          nameWithOwner: 'grace/compiler',
          description: 'A-0',
          url: 'https://github.com/grace/compiler',
          stars: 42,
          language: { name: 'COBOL', color: '#ff0000' },
        },
        expect.objectContaining({ name: 'odd', language: { name: 'X', color: null } }),
      ],
    });
    expect(calls[0]?.headers.get('authorization')).toBe('Bearer token-1');
  });

  it('rejects repositories that do not point to github.com', async () => {
    const { fetch } = fakeFetch({
      '/graphql': {
        data: {
          viewer: {
            login: 'grace',
            pinnedItems: { nodes: [{ ...repo, url: 'javascript:alert(1)' }] },
          },
        },
      },
    });
    await expect(createGitHubClient({ fetch }).viewer('t')).rejects.toThrow();
  });

  it('reads every page of the following list', async () => {
    const page1 = Array.from({ length: 100 }, (_, index) => ({ id: index + 1 }));
    const { fetch, calls } = fakeFetch({
      '/user/following?per_page=100&page=1': page1,
      '/user/following?per_page=100&page=2': [{ id: 101 }],
    });

    const ids = await createGitHubClient({ fetch }).followingIds('t');
    expect(ids).toHaveLength(101);
    expect(ids.at(-1)).toBe('101');
    expect(calls).toHaveLength(2);
  });

  it('turns HTTP errors into GitHubError', async () => {
    const { fetch } = fakeFetch({}, 401);
    await expect(createGitHubClient({ fetch }).followingIds('t')).rejects.toBeInstanceOf(
      GitHubError,
    );
  });
});
