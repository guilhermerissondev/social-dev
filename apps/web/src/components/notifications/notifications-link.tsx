'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';

import { Link, usePathname } from '@/i18n/navigation.ts';

/** Fired by the notifications page after marking them as read. */
export const NOTIFICATIONS_READ_EVENT = 'social-dev:notifications-read';

/** Header link to the notifications page, with the unread count. */
export function NotificationsLink() {
  const t = useTranslations('Header');
  const pathname = usePathname();
  const [unread, setUnread] = useState(0);
  // Bumped when notifications are marked read, so a count requested before that is dropped.
  const readGeneration = useRef(0);

  // Refreshed on every navigation; live updates (push) can come later.
  useEffect(() => {
    let active = true;
    const generation = readGeneration.current;
    void fetch('/api/notifications/unread-count')
      .then((res) => (res.ok ? (res.json() as Promise<{ count: number }>) : { count: 0 }))
      .then(({ count }) => {
        if (active && generation === readGeneration.current) setUnread(count);
      });
    return () => {
      active = false;
    };
  }, [pathname]);

  useEffect(() => {
    const clear = () => {
      readGeneration.current += 1;
      setUnread(0);
    };
    window.addEventListener(NOTIFICATIONS_READ_EVENT, clear);
    return () => {
      window.removeEventListener(NOTIFICATIONS_READ_EVENT, clear);
    };
  }, []);

  return (
    <Link
      href="/notifications"
      className="relative mr-2 text-sm text-zinc-300 hover:text-zinc-100"
      aria-label={unread > 0 ? t('notificationsUnread', { count: unread }) : t('notifications')}
    >
      {t('notifications')}
      {unread > 0 && (
        <span
          aria-hidden
          className="absolute -top-2 -right-3 min-w-4 rounded-full bg-emerald-500 px-1 text-center text-[10px] leading-4 font-bold text-zinc-950"
        >
          {unread > 99 ? '99+' : unread}
        </span>
      )}
    </Link>
  );
}
