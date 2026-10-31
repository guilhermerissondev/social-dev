import { getLocale, getTranslations } from 'next-intl/server';

import { AuthCard } from '@/components/auth/auth-card.tsx';
import { UsernameForm } from '@/components/profile/username-form.tsx';
import { redirect } from '@/i18n/navigation.ts';
import { requireUser } from '@/lib/guards.ts';

/** First stop for GitHub and GitLab sign-ups, which arrive without a username. */
export default async function WelcomePage() {
  const user = await requireUser();
  if (user.username) {
    redirect({ href: '/home', locale: await getLocale() });
  }
  const t = await getTranslations('Welcome');

  return (
    <AuthCard title={t('title', { name: user.name })} subtitle={t('subtitle')}>
      <UsernameForm />
    </AuthCard>
  );
}
