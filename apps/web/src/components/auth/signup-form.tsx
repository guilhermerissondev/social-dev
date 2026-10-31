'use client';

import { Alert, Button, Field } from '@social-dev/ui';
import { useLocale, useTranslations } from 'next-intl';
import { useState, type SubmitEvent } from 'react';

import { getPathname, Link, useRouter } from '@/i18n/navigation.ts';
import { authClient } from '@/lib/auth-client.ts';
import { authErrorKey, type AuthErrorKey } from '@/lib/auth-errors.ts';
import { formText } from '@/lib/form.ts';

export function SignupForm() {
  const t = useTranslations('Auth');
  const locale = useLocale();
  const router = useRouter();
  const [error, setError] = useState<AuthErrorKey | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    setPending(true);
    setError(null);
    const { error } = await authClient.signUp.email({
      name: formText(form, 'name').trim(),
      username: formText(form, 'username').trim(),
      email: formText(form, 'email').trim(),
      password: formText(form, 'password'),
      // Where the confirmation link sends the user once the email is verified.
      callbackURL: getPathname({ href: '/home', locale }),
    });
    setPending(false);

    if (error) {
      setError(authErrorKey(error));
      return;
    }
    router.push('/check-email');
  }

  return (
    <form onSubmit={(event) => void onSubmit(event)} className="flex flex-col gap-4">
      {error && <Alert tone="error">{t(`errors.${error}`)}</Alert>}
      <Field label={t('signup.name')} name="name" autoComplete="name" required maxLength={100} />
      <Field
        label={t('signup.username')}
        hint={t('signup.usernameHint')}
        name="username"
        autoComplete="username"
        required
        minLength={3}
        maxLength={30}
        pattern="[A-Za-z0-9_]+"
      />
      <Field label={t('signup.email')} name="email" type="email" autoComplete="email" required />
      <Field
        label={t('signup.password')}
        hint={t('signup.passwordHint')}
        name="password"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        maxLength={128}
      />
      <Button type="submit" disabled={pending}>
        {t('signup.submit')}
      </Button>
      <p className="text-center text-sm text-zinc-400">
        {t('signup.hasAccount')}{' '}
        <Link href="/login" className="text-emerald-400 hover:underline">
          {t('signup.loginLink')}
        </Link>
      </p>
    </form>
  );
}
