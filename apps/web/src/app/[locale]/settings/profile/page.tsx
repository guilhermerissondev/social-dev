import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { ProfileForm } from '@/components/profile/profile-form.tsx';
import { Link } from '@/i18n/navigation.ts';
import { requireUserWithUsername } from '@/lib/guards.ts';
import { getProfile } from '@/lib/profiles.ts';

export default async function ProfileSettingsPage() {
  const user = await requireUserWithUsername();
  const [t, profile] = await Promise.all([
    getTranslations('ProfileForm'),
    getProfile(user.username),
  ]);
  if (!profile) notFound();

  return (
    <div className="mx-auto max-w-xl px-6 py-12">
      <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
      <p className="mt-2 text-sm text-zinc-400">{t('subtitle')}</p>
      <Link
        href="/settings/github"
        className="mt-2 inline-block text-sm text-emerald-400 hover:underline"
      >
        {t('githubLink')}
      </Link>
      <div className="mt-8">
        <ProfileForm profile={profile} />
      </div>
    </div>
  );
}
