'use client';

import { Button } from '@social-dev/ui';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { useRouter } from '@/i18n/navigation.ts';
import { useHydrated } from '@/lib/use-hydrated.ts';

/** Show-on-profile toggle and the refresh button of the GitHub settings page. */
export function GitHubSettings({ showOnProfile }: { showOnProfile: boolean }) {
  const t = useTranslations('GitHub');
  const router = useRouter();
  const hydrated = useHydrated();
  const [show, setShow] = useState(showOnProfile);
  const [pending, setPending] = useState(false);

  async function toggle(next: boolean) {
    setShow(next);
    const res = await fetch('/api/me/github/settings', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ showOnProfile: next }),
    });
    if (!res.ok) setShow(!next);
  }

  async function refresh() {
    setPending(true);
    await fetch('/api/me/github/refresh', { method: 'POST' });
    setPending(false);
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <label className="flex items-center gap-2 text-sm text-zinc-200">
        <input
          type="checkbox"
          checked={show}
          disabled={!hydrated}
          onChange={(event) => void toggle(event.target.checked)}
          className="size-4 accent-emerald-500"
        />
        {t('showOnProfile')}
      </label>
      <Button variant="secondary" disabled={pending || !hydrated} onClick={() => void refresh()}>
        {t('refresh')}
      </Button>
    </div>
  );
}
