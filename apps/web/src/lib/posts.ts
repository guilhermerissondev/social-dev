import 'server-only';

import { cache } from 'react';

import { apiFetch } from './api.ts';

export interface Post {
  id: string;
  title: string | null;
  content: string;
  contentHtml: string;
  author: { id: string; username: string; displayName: string; avatarUrl: string | null };
  createdAt: string;
  editedAt: string | null;
}

export interface PostPage {
  items: Post[];
  nextCursor: string | null;
}

/** A post by id, or null when it does not exist (or the id is malformed). */
export const getPost = cache(async (id: string): Promise<Post | null> => {
  const res = await apiFetch(`/api/posts/${encodeURIComponent(id)}`);
  if (res.status === 404 || res.status === 400) return null;
  if (!res.ok) throw new Error(`failed to load post: ${res.status}`);
  return (await res.json()) as Post;
});

async function fetchPage(path: string, before: string | undefined): Promise<PostPage> {
  const query = before ? `?before=${encodeURIComponent(before)}` : '';
  const res = await apiFetch(`${path}${query}`);
  // A tampered cursor is not worth an error page; show the first page instead.
  if (res.status === 400 && before) return fetchPage(path, undefined);
  if (!res.ok) throw new Error(`failed to load posts: ${res.status}`);
  return (await res.json()) as PostPage;
}

export function listProfilePosts(username: string, before?: string) {
  return fetchPage(`/api/profiles/${encodeURIComponent(username)}/posts`, before);
}

export function listTagPosts(tag: string, before?: string) {
  return fetchPage(`/api/tags/${encodeURIComponent(tag)}/posts`, before);
}
