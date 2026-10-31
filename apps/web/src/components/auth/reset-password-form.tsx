'use client';

import { Alert, Button, Field } from '@social-dev/ui';
import { useTranslations } from 'next-intl';
import { useState, type SubmitEvent } from 'react';

import { Link } from '@/i18n/navigation.ts';
import { authClient } from '@/lib/auth-client.ts';
import { authErrorKey, type AuthErrorKey } from '@/lib/auth-errors.ts';
import { formText } from '@/lib/form.ts';

export function ResetPasswordForm({ token }: { token: string | null }) {
  const t = useTranslations('Auth');
  const [error, setError] = useState<AuthErrorKey | null>(null);
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);

  if (!token) {
    return (
      <div className="flex flex-col gap-4">
        <Alert tone="error">{t('resetPassword.invalidLink')}</Alert>
        <Link href="/forgot-password" className="text-sm text-emerald-400 hover:underline">
          {t('resetPassword.requestNew')}
        </Link>
      </div>
    );
  }

  async function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    const form = new FormData(event.currentTarget);

    setPending(true);
    setError(null);
    const { error } = await authClient.resetPassword({
      token,
      newPassword: formText(form, 'password'),
    });
    setPending(false);

    if (error) {
      setError(authErrorKey(error));
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <div className="flex flex-col gap-4">
        <Alert tone="success">{t('resetPassword.success')}</Alert>
        <Link href="/login" className="text-sm text-emerald-400 hover:underline">
          {t('resetPassword.login')}
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={(event) => void onSubmit(event)} className="flex flex-col gap-4">
      {error && <Alert tone="error">{t(`errors.${error}`)}</Alert>}
      <Field
        label={t('resetPassword.password')}
        name="password"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        maxLength={128}
      />
      <Button type="submit" disabled={pending}>
        {t('resetPassword.submit')}
      </Button>
    </form>
  );
}
