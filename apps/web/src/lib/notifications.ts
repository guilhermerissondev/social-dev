import 'server-only';

import { apiFetch } from './api.ts';

export interface Notification {
  id: string;
  type: 'follow' | 'like' | 'reply';
  read: boolean;
  createdAt: string;
  actor: { username: string; displayName: string; avatarUrl: string | null };
  post: { id: string; authorUsername: string; title: string | null; excerpt: string } | null;
}

export interface NotificationPage {
  items: Notification[];
  nextCursor: string | null;
}

export async function getNotifications(before?: string): Promise<NotificationPage> {
  const query = before ? `?before=${encodeURIComponent(before)}` : '';
  const res = await apiFetch(`/api/notifications${query}`);
  if (res.status === 400 && before) return getNotifications();
  if (!res.ok) throw new Error(`failed to load notifications: ${res.status}`);
  return (await res.json()) as NotificationPage;
}
