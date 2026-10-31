'use client';

import { Button } from '@social-dev/ui';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { useRouter } from '@/i18n/navigation.ts';
import { useHydrated } from '@/lib/use-hydrated.ts';

/** Follows everyone on Social Dev the viewer follows on GitHub. */
export function FollowAllFromGitHubButton({ count }: { count: number }) {
  const t = useTranslations('GitHub');
  const router = useRouter();
  const hydrated = useHydrated();
  const [pending, setPending] = useState(false);

  async function followAll() {
    setPending(true);
    await fetch('/api/me/github/follow-all', { method: 'POST' });
    setPending(false);
    router.refresh();
  }

  return (
    <Button disabled={pending || !hydrated || count === 0} onClick={() => void followAll()}>
      {t('followAll', { count })}
    </Button>
  );
}
