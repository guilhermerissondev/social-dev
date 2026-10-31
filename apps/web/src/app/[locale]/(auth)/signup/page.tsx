import { getLocale, getTranslations } from 'next-intl/server';

import { AuthCard } from '@/components/auth/auth-card.tsx';
import { SignupForm } from '@/components/auth/signup-form.tsx';
import { SocialButtons } from '@/components/auth/social-buttons.tsx';
import { getPathname } from '@/i18n/navigation.ts';
import { redirectIfSignedIn } from '@/lib/guards.ts';
import { getAuthProviders } from '@/lib/session.ts';

export default async function SignupPage() {
  await redirectIfSignedIn();
  const [t, providers, locale] = await Promise.all([
    getTranslations('Auth.signup'),
    getAuthProviders(),
    getLocale(),
  ]);

  return (
    <AuthCard title={t('title')} subtitle={t('subtitle')}>
      <div className="flex flex-col gap-6">
        <SocialButtons providers={providers} callbackURL={getPathname({ href: '/home', locale })} />
        <SignupForm />
      </div>
    </AuthCard>
  );
}
