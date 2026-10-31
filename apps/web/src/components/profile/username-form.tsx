'use client';

import { USERNAME_MAX_LENGTH, USERNAME_MIN_LENGTH } from '@social-dev/shared';
import { Alert, Button, Field } from '@social-dev/ui';
import { useTranslations } from 'next-intl';
import { useState, type SubmitEvent } from 'react';

import { useRouter } from '@/i18n/navigation.ts';
import { apiErrorCode } from '@/lib/api-errors.ts';
import { authClient } from '@/lib/auth-client.ts';
import { formText } from '@/lib/form.ts';
import { useHydrated } from '@/lib/use-hydrated.ts';

type FormError = 'taken' | 'invalid' | 'unknown';

export function UsernameForm() {
  const t = useTranslations('Welcome');
  const hydrated = useHydrated();
  const router = useRouter();
  const { refetch } = authClient.useSession();
  const [error, setError] = useState<FormError | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    setPending(true);
    setError(null);
    const res = await fetch('/api/me/username', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: formText(form, 'username').trim() }),
    });

    if (!res.ok) {
      const code = await apiErrorCode(res);
      setPending(false);
      setError(
        code === 'username_taken' ? 'taken' : code === 'validation_error' ? 'invalid' : 'unknown',
      );
      return;
    }
    // The header reads the session on the client; reload it so it shows the new handle.
    await refetch();
    router.push('/home');
    router.refresh();
  }

  return (
    <form onSubmit={(event) => void onSubmit(event)} className="flex flex-col gap-4">
      {error && <Alert tone="error">{t(`errors.${error}`)}</Alert>}
      <Field
        label={t('username')}
        hint={t('usernameHint')}
        name="username"
        autoComplete="username"
        required
        minLength={USERNAME_MIN_LENGTH}
        maxLength={USERNAME_MAX_LENGTH}
        pattern="[A-Za-z0-9_]+"
      />
      <Button type="submit" disabled={pending || !hydrated}>
        {t('submit')}
      </Button>
    </form>
  );
}
