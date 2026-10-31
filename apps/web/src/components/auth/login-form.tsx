'use client';

import { Alert, Button, Field } from '@social-dev/ui';
import { useTranslations } from 'next-intl';
import { useState, type SubmitEvent } from 'react';

import { Link, useRouter } from '@/i18n/navigation.ts';
import { authClient } from '@/lib/auth-client.ts';
import { authErrorKey, type AuthErrorKey } from '@/lib/auth-errors.ts';
import { formText } from '@/lib/form.ts';
import { useHydrated } from '@/lib/use-hydrated.ts';

export function LoginForm() {
  const t = useTranslations('Auth');
  const hydrated = useHydrated();
  const router = useRouter();
  const [error, setError] = useState<AuthErrorKey | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const identifier = formText(form, 'identifier').trim();
    const password = formText(form, 'password');

    setPending(true);
    setError(null);
    const { error } = identifier.includes('@')
      ? await authClient.signIn.email({ email: identifier, password })
      : await authClient.signIn.username({ username: identifier, password });
    setPending(false);

    if (error) {
      setError(authErrorKey(error));
      return;
    }
    router.push('/home');
    router.refresh();
  }

  return (
    <form onSubmit={(event) => void onSubmit(event)} className="flex flex-col gap-4">
      {error && (
        <Alert tone={error === 'EMAIL_NOT_VERIFIED' ? 'info' : 'error'}>
          {t(`errors.${error}`)}
        </Alert>
      )}
      <Field label={t('login.identifier')} name="identifier" autoComplete="username" required />
      <Field
        label={t('login.password')}
        name="password"
        type="password"
        autoComplete="current-password"
        required
      />
      <Link href="/forgot-password" className="self-end text-sm text-emerald-400 hover:underline">
        {t('login.forgotPassword')}
      </Link>
      <Button type="submit" disabled={pending || !hydrated}>
        {t('login.submit')}
      </Button>
      <p className="text-center text-sm text-zinc-400">
        {t('login.noAccount')}{' '}
        <Link href="/signup" className="text-emerald-400 hover:underline">
          {t('login.signupLink')}
        </Link>
      </p>
    </form>
  );
}
