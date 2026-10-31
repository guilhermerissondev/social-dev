'use client';

import { Button, buttonClasses } from '@social-dev/ui';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Link, useRouter } from '@/i18n/navigation.ts';
import { useHydrated } from '@/lib/use-hydrated.ts';

export interface FollowButtonProps {
  /** API path that accepts POST (follow) and DELETE (unfollow). */
  apiPath: string;
  following: boolean;
  /** Set when the viewer cannot follow yet; the button becomes a link there. */
  fallbackHref: '/login' | '/welcome' | null;
  /** Accessible name, e.g. "Seguir @ada", so several buttons on a page stay distinguishable. */
  label: string;
}

export function FollowButton({ apiPath, following, fallbackHref, label }: FollowButtonProps) {
  const t = useTranslations('Follow');
  const hydrated = useHydrated();
  const router = useRouter();
  const [isFollowing, setIsFollowing] = useState(following);
  const [pending, setPending] = useState(false);

  if (fallbackHref) {
    return (
      <Link href={fallbackHref} className={buttonClasses('primary')} aria-label={label}>
        {t('follow')}
      </Link>
    );
  }

  async function toggle() {
    const next = !isFollowing;
    setPending(true);
    // Optimistic: flip right away and roll back if the request fails.
    setIsFollowing(next);
    const res = await fetch(apiPath, { method: next ? 'POST' : 'DELETE' });
    setPending(false);
    if (!res.ok) {
      setIsFollowing(!next);
      return;
    }
    // Refresh server-rendered counts.
    router.refresh();
  }

  return (
    <Button
      variant={isFollowing ? 'secondary' : 'primary'}
      aria-pressed={isFollowing}
      aria-label={label}
      disabled={pending || !hydrated}
      onClick={() => void toggle()}
      className="group min-w-28"
    >
      {isFollowing ? (
        <>
          <span className="group-hover:hidden">{t('following')}</span>
          <span className="hidden group-hover:inline">{t('unfollow')}</span>
        </>
      ) : (
        t('follow')
      )}
    </Button>
  );
}
