'use client';

import { Button } from '@social-dev/ui';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { authClient } from '@/lib/auth-client.ts';
import type { OAuthProvider } from '@/lib/session.ts';

const labels: Record<OAuthProvider, string> = { github: 'GitHub', gitlab: 'GitLab' };

export function SocialButtons({
  providers,
  callbackURL,
}: {
  providers: OAuthProvider[];
  callbackURL: string;
}) {
  const t = useTranslations('Auth');
  const [pending, setPending] = useState<OAuthProvider | null>(null);

  if (providers.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      {providers.map((provider) => (
        <Button
          key={provider}
          variant="secondary"
          disabled={pending !== null}
          onClick={() => {
            setPending(provider);
            void authClient.signIn.social({ provider, callbackURL });
          }}
        >
          {t('continueWith', { provider: labels[provider] })}
        </Button>
      ))}
      <p className="text-center text-xs text-zinc-500 uppercase">{t('or')}</p>
    </div>
  );
}
