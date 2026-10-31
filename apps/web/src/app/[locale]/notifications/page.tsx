import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { MarkNotificationsRead } from '@/components/notifications/mark-read.tsx';
import { NotificationItem } from '@/components/notifications/notification-item.tsx';
import { requireUserWithUsername } from '@/lib/guards.ts';
import { queryValue } from '@/lib/handles.ts';
import { getNotifications } from '@/lib/notifications.ts';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Notifications');
  return { title: `${t('title')} · Social Dev`, robots: { index: false } };
}

export default async function NotificationsPage({
  searchParams,
}: PageProps<'/[locale]/notifications'>) {
  await requireUserWithUsername();
  const before = queryValue((await searchParams).before);
  const [t, page] = await Promise.all([getTranslations('Notifications'), getNotifications(before)]);
  const newest = page.items[0];

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="border-b border-zinc-800 pb-4 text-2xl font-bold tracking-tight">
        {t('title')}
      </h1>
      {page.items.length === 0 ? (
        <p className="py-10 text-center text-sm text-zinc-500">{t('empty')}</p>
      ) : (
        <ul>
          {page.items.map((notification) => (
            <NotificationItem key={notification.id} notification={notification} />
          ))}
        </ul>
      )}
      {/* Only the first page marks as read; older pages were seen before. */}
      {!before && newest && !newest.read && <MarkNotificationsRead upTo={newest.id} />}
      {page.nextCursor && (
        <div className="py-6 text-center">
          <a
            href={`?before=${page.nextCursor}`}
            className="text-sm text-emerald-400 hover:underline"
          >
            {t('older')}
          </a>
        </div>
      )}
    </div>
  );
}
