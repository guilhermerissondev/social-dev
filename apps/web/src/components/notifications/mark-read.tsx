'use client';

import { useEffect } from 'react';

import { NOTIFICATIONS_READ_EVENT } from './notifications-link.tsx';

/**
 * Marks notifications as read once the page has shown them. Unread ones keep their
 * highlight until the next visit, so the person can still tell what is new.
 */
export function MarkNotificationsRead({ upTo }: { upTo: string }) {
  useEffect(() => {
    void fetch('/api/notifications/read', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ upTo }),
    }).then((res) => {
      if (res.ok) window.dispatchEvent(new Event(NOTIFICATIONS_READ_EVENT));
    });
  }, [upTo]);

  return null;
}
