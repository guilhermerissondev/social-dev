import type { PinnedRepo } from '@social-dev/db';
import { z } from 'zod';

const API_URL = 'https://api.github.com';
/** Following lists are read up to this many pages of 100. */
const MAX_FOLLOWING_PAGES = 10;

/** What the API reads from GitHub, always with the person's own token. */
export interface GitHubClient {
  /** Login and pinned repositories of the token's owner. */
  viewer(token: string): Promise<{ login: string; pinnedRepos: PinnedRepo[] }>;
  /** Numeric ids (as strings) of the accounts the token's owner follows. */
  followingIds(token: string): Promise<string[]>;
}

/** GitHub answered with an error (expired token, rate limit, outage). */
export class GitHubError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'GitHubError';
  }
}

// GitHub responses are external input: only fields that pass these schemas are kept.
const repoSchema = z.object({
  name: z.string().max(100),
  nameWithOwner: z.string().max(200),
  description: z.string().max(1000).nullable(),
  url: z.url({ protocol: /^https$/, hostname: /^github\.com$/ }),
  stargazerCount: z.number().int().nonnegative(),
  primaryLanguage: z
    .object({
      name: z.string().max(100),
      color: z
        .string()
        .regex(/^#[0-9a-f]{6}$/i)
        .nullable()
        .catch(null),
    })
    .nullable(),
});

const viewerSchema = z.object({
  data: z.object({
    viewer: z.object({
      login: z.string().max(100),
      pinnedItems: z.object({
        // Pinned gists come back as empty objects; they are dropped below.
        nodes: z.array(z.union([repoSchema, z.object({}).strict()])),
      }),
    }),
  }),
});

const followingSchema = z.array(z.object({ id: z.number().int() }));

const VIEWER_QUERY = `query {
  viewer {
    login
    pinnedItems(first: 6, types: REPOSITORY) {
      nodes {
        ... on Repository {
          name nameWithOwner description url stargazerCount
          primaryLanguage { name color }
        }
      }
    }
  }
}`;

export function createGitHubClient({
  fetch = globalThis.fetch,
  apiUrl = API_URL,
}: { fetch?: typeof globalThis.fetch; apiUrl?: string } = {}): GitHubClient {
  async function request(path: string, token: string, init: RequestInit = {}) {
    const res = await fetch(`${apiUrl}${path}`, {
      ...init,
      headers: {
        accept: 'application/vnd.github+json',
        authorization: `Bearer ${token}`,
        'user-agent': 'social-dev',
        'x-github-api-version': '2022-11-28',
        ...(init.body ? { 'content-type': 'application/json' } : {}),
      },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new GitHubError(res.status, `GitHub API ${path} failed with ${res.status}`);
    return res.json() as Promise<unknown>;
  }

  return {
    async viewer(token) {
      const body = viewerSchema.parse(
        await request('/graphql', token, {
          method: 'POST',
          body: JSON.stringify({ query: VIEWER_QUERY }),
        }),
      );
      const { login, pinnedItems } = body.data.viewer;
      return {
        login,
        pinnedRepos: pinnedItems.nodes.flatMap((node) =>
          'name' in node
            ? [
                {
                  name: node.name,
                  nameWithOwner: node.nameWithOwner,
                  description: node.description,
                  url: node.url,
                  stars: node.stargazerCount,
                  language: node.primaryLanguage,
                },
              ]
            : [],
        ),
      };
    },

    async followingIds(token) {
      const ids: string[] = [];
      for (let page = 1; page <= MAX_FOLLOWING_PAGES; page += 1) {
        const accounts = followingSchema.parse(
          await request(`/user/following?per_page=100&page=${page}`, token),
        );
        ids.push(...accounts.map((account) => String(account.id)));
        if (accounts.length < 100) break;
      }
      return ids;
    },
  };
}
