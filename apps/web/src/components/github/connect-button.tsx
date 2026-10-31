'use client';

import { Button } from '@social-dev/ui';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';

import { getPathname } from '@/i18n/navigation.ts';
import { authClient } from '@/lib/auth-client.ts';
import { useHydrated } from '@/lib/use-hydrated.ts';

/** Links GitHub to the signed-in account and comes back to the GitHub settings. */
export function ConnectGitHubButton() {
  const t = useTranslations('GitHub');
  const locale = useLocale();
  const hydrated = useHydrated();
  const [pending, setPending] = useState(false);

  return (
    <Button
      disabled={pending || !hydrated}
      onClick={() => {
        setPending(true);
        const settings = getPathname({ href: '/settings/github', locale });
        // On failure Better Auth comes back with ?error=<code>, which the page explains.
        void authClient.linkSocial({
          provider: 'github',
          callbackURL: settings,
          errorCallbackURL: settings,
        });
      }}
    >
      {t('connect')}
    </Button>
  );
}
