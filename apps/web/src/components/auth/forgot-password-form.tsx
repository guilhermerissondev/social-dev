'use client';

import { Alert, Button, Field } from '@social-dev/ui';
import { useLocale, useTranslations } from 'next-intl';
import { useState, type SubmitEvent } from 'react';

import { getPathname, Link } from '@/i18n/navigation.ts';
import { authClient } from '@/lib/auth-client.ts';
import { authErrorKey, type AuthErrorKey } from '@/lib/auth-errors.ts';
import { formText } from '@/lib/form.ts';
import { useHydrated } from '@/lib/use-hydrated.ts';

export function ForgotPasswordForm() {
  const t = useTranslations('Auth');
  const hydrated = useHydrated();
  const locale = useLocale();
  const [error, setError] = useState<AuthErrorKey | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    setPending(true);
    setError(null);
    const { error } = await authClient.requestPasswordReset({
      email: formText(form, 'email').trim(),
      redirectTo: getPathname({ href: '/reset-password', locale }),
    });
    setPending(false);

    if (error) {
      setError(authErrorKey(error));
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="flex flex-col gap-4">
        <Alert tone="success">{t('forgotPassword.sent')}</Alert>
        <Link href="/login" className="text-sm text-emerald-400 hover:underline">
          {t('forgotPassword.back')}
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={(event) => void onSubmit(event)} className="flex flex-col gap-4">
      {error && <Alert tone="error">{t(`errors.${error}`)}</Alert>}
      <Field
        label={t('forgotPassword.email')}
        name="email"
        type="email"
        autoComplete="email"
        required
      />
      <Button type="submit" disabled={pending || !hydrated}>
        {t('forgotPassword.submit')}
      </Button>
      <Link href="/login" className="text-center text-sm text-emerald-400 hover:underline">
        {t('forgotPassword.back')}
      </Link>
    </form>
  );
}
