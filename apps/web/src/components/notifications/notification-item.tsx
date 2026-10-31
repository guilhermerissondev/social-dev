import { cn } from '@social-dev/ui';
import { useFormatter, useTranslations } from 'next-intl';

import { Avatar } from '@/components/profile/avatar.tsx';
import { Link } from '@/i18n/navigation.ts';
import type { Notification } from '@/lib/notifications.ts';

export function NotificationItem({ notification }: { notification: Notification }) {
  const t = useTranslations('Notifications');
  const format = useFormatter();
  const { actor, post } = notification;

  return (
    <li
      className={cn(
        'flex gap-3 border-b border-zinc-800 px-2 py-4',
        !notification.read && 'bg-emerald-950/20',
      )}
    >
      <Avatar name={actor.displayName} url={actor.avatarUrl} />
      <div className="min-w-0 text-sm">
        <p className="text-zinc-300">
          {t.rich(notification.type, {
            actor: () => (
              <Link
                href={`/@${actor.username}`}
                className="font-semibold text-zinc-100 hover:underline"
              >
                {actor.displayName}
              </Link>
            ),
          })}
          {!notification.read && <span className="sr-only"> ({t('unread')})</span>}
        </p>
        {post && (
          <Link
            href={`/@${post.authorUsername}/${post.id}`}
            className="mt-1 block truncate text-zinc-400 hover:text-zinc-200"
          >
            {post.title ?? post.excerpt}
          </Link>
        )}
        <time dateTime={notification.createdAt} className="mt-1 block text-xs text-zinc-500">
          {format.dateTime(new Date(notification.createdAt), {
            dateStyle: 'medium',
            timeStyle: 'short',
          })}
        </time>
      </div>
    </li>
  );
}
