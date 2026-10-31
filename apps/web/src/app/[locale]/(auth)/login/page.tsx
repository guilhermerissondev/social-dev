import { getLocale, getTranslations } from 'next-intl/server';

import { AuthCard } from '@/components/auth/auth-card.tsx';
import { LoginForm } from '@/components/auth/login-form.tsx';
import { SocialButtons } from '@/components/auth/social-buttons.tsx';
import { getPathname } from '@/i18n/navigation.ts';
import { redirectIfSignedIn } from '@/lib/guards.ts';
import { getAuthProviders } from '@/lib/session.ts';

export default async function LoginPage() {
  await redirectIfSignedIn();
  const [t, providers, locale] = await Promise.all([
    getTranslations('Auth.login'),
    getAuthProviders(),
    getLocale(),
  ]);

  return (
    <AuthCard title={t('title')}>
      <div className="flex flex-col gap-6">
        <SocialButtons providers={providers} callbackURL={getPathname({ href: '/home', locale })} />
        <LoginForm />
      </div>
    </AuthCard>
  );
}
