import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { FinishOnboardingButton } from '@/components/onboarding/finish-button.tsx';
import { ProfileStep } from '@/components/onboarding/profile-step.tsx';
import { SuggestionRow } from '@/components/onboarding/suggestion-row.tsx';
import { TagsStep } from '@/components/onboarding/tags-step.tsx';
import { Link } from '@/i18n/navigation.ts';
import { requireUserWithUsername } from '@/lib/guards.ts';
import { queryValue } from '@/lib/handles.ts';
import { getProfile } from '@/lib/profiles.ts';
import { getPeopleSuggestions, getTagSuggestions } from '@/lib/suggestions.ts';

const steps = ['profile', 'tags', 'people'] as const;
type Step = (typeof steps)[number];

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Onboarding');
  return { title: `${t('title')} · Social Dev`, robots: { index: false } };
}

/**
 * Three steps after sign-up: stack and area, tags to follow, people to follow. Each can be
 * skipped; finishing (or skipping the last one) opens the feed.
 */
export default async function OnboardingPage({ searchParams }: PageProps<'/[locale]/onboarding'>) {
  const user = await requireUserWithUsername();
  const stepParam = queryValue((await searchParams).step);
  const step: Step = steps.find((option) => option === stepParam) ?? 'profile';
  const t = await getTranslations('Onboarding');
  const next = steps[steps.indexOf(step) + 1];

  return (
    <div className="mx-auto max-w-xl px-6 py-12">
      <p className="text-sm text-zinc-400">
        {t('progress', { step: steps.indexOf(step) + 1, total: steps.length })}
      </p>
      <h1 className="mt-1 text-2xl font-bold tracking-tight">{t(`${step}Title`)}</h1>
      <p className="mt-2 text-sm text-zinc-400">{t(`${step}Subtitle`)}</p>

      <div className="mt-8">
        <StepContent step={step} username={user.username} />
      </div>

      <div className="mt-6 flex justify-end">
        {next ? (
          <Link
            href={`/onboarding?step=${next}`}
            className="text-sm text-zinc-400 hover:text-zinc-100"
          >
            {t('skip')}
          </Link>
        ) : null}
      </div>
    </div>
  );
}

async function StepContent({ step, username }: { step: Step; username: string }) {
  const t = await getTranslations('Onboarding');

  switch (step) {
    case 'profile': {
      const profile = await getProfile(username);
      if (!profile) notFound();
      return <ProfileStep profile={profile} />;
    }
    case 'tags': {
      const [profile, tags] = await Promise.all([getProfile(username), getTagSuggestions(20)]);
      return <TagsStep tags={tags} preselected={profile?.technologies ?? []} />;
    }
    case 'people': {
      const people = await getPeopleSuggestions(10);
      return (
        <div className="flex flex-col gap-6">
          {people.length === 0 ? (
            <p className="text-sm text-zinc-400">{t('noPeople')}</p>
          ) : (
            <ul className="border-t border-zinc-800">
              {people.map((person) => (
                <SuggestionRow key={person.id} person={person} />
              ))}
            </ul>
          )}
          <FinishOnboardingButton label={t('finish')} />
        </div>
      );
    }
  }
}
