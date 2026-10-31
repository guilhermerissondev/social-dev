'use client';

import { Button, buttonClasses } from '@social-dev/ui';
import { useTranslations } from 'next-intl';

import { Link, useRouter } from '@/i18n/navigation.ts';
import { authClient } from '@/lib/auth-client.ts';

import { NotificationsLink } from './notifications/notifications-link.tsx';

/** Log in / sign up links, or the signed-in user's handle and a log out button. */
export function HeaderActions() {
  const t = useTranslations('Header');
  const router = useRouter();
  const { data, isPending } = authClient.useSession();

  if (isPending) return null;

  if (data) {
    const handle = data.user.displayUsername ?? data.user.username;
    return (
      <>
        {handle && (
          <>
            <Link href="/home" className="text-sm text-zinc-300 hover:text-zinc-100">
              {t('feed')}
            </Link>
            <Link href="/saved" className="text-sm text-zinc-300 hover:text-zinc-100">
              {t('saved')}
            </Link>
            <NotificationsLink />
          </>
        )}
        <Link
          href={handle ? `/@${handle}` : '/welcome'}
          className="text-sm text-zinc-300 hover:text-zinc-100"
          title={t('profile')}
        >
          {handle ? `@${handle}` : data.user.name}
        </Link>
        <Button
          variant="secondary"
          onClick={() => {
            void authClient.signOut().then(() => {
              router.push('/');
              router.refresh();
            });
          }}
        >
          {t('logout')}
        </Button>
      </>
    );
  }

  return (
    <>
      <Link href="/login" className={buttonClasses('secondary')}>
        {t('login')}
      </Link>
      <Link href="/signup" className={buttonClasses('primary')}>
        {t('signup')}
      </Link>
    </>
  );
}
