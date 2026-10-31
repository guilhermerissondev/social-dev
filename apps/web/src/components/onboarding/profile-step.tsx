'use client';

import { AREAS, normalizeTag, SENIORITIES } from '@social-dev/shared';
import { Alert, Button, Field, SelectField } from '@social-dev/ui';
import { useTranslations } from 'next-intl';
import { useState, type SubmitEvent } from 'react';

import { useRouter } from '@/i18n/navigation.ts';
import { formText } from '@/lib/form.ts';
import type { Profile } from '@/lib/profiles.ts';
import { useHydrated } from '@/lib/use-hydrated.ts';

/** Step 1: the profile fields that drive suggestions. Saves and moves to the next step. */
export function ProfileStep({ profile }: { profile: Profile }) {
  const t = useTranslations('Onboarding');
  const tProfile = useTranslations('Profile');
  const router = useRouter();
  const hydrated = useHydrated();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const technologies = formText(form, 'technologies')
      .split(/[\s,]+/)
      .filter(Boolean);
    const invalid = technologies.filter((tech) => normalizeTag(tech) === null);
    if (invalid.length > 0) {
      setError(t('invalidTechnologies', { detail: invalid.join(', ') }));
      return;
    }

    setPending(true);
    setError(null);
    // The profile endpoint replaces everything, so unchanged fields are sent back as they are.
    const res = await fetch('/api/me/profile', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        displayName: profile.displayName,
        bio: profile.bio,
        links: profile.links,
        location: formText(form, 'location'),
        area: formText(form, 'area') || null,
        seniority: formText(form, 'seniority') || null,
        technologies,
      }),
    });
    setPending(false);
    if (!res.ok) {
      setError(t('saveFailed'));
      return;
    }
    router.push('/onboarding?step=tags');
  }

  return (
    <form onSubmit={(event) => void onSubmit(event)} className="flex flex-col gap-4">
      {error && <Alert tone="error">{error}</Alert>}
      <Field
        label={t('technologies')}
        hint={t('technologiesHint')}
        name="technologies"
        defaultValue={profile.technologies.join(', ')}
        placeholder="typescript, react, postgresql"
      />
      <div className="grid grid-cols-2 gap-3">
        <SelectField label={tProfile('area')} name="area" defaultValue={profile.area ?? ''}>
          <option value="">{t('notSaying')}</option>
          {AREAS.map((area) => (
            <option key={area} value={area}>
              {tProfile(`areas.${area}`)}
            </option>
          ))}
        </SelectField>
        <SelectField
          label={tProfile('seniority')}
          name="seniority"
          defaultValue={profile.seniority ?? ''}
        >
          <option value="">{t('notSaying')}</option>
          {SENIORITIES.map((seniority) => (
            <option key={seniority} value={seniority}>
              {tProfile(`seniorities.${seniority}`)}
            </option>
          ))}
        </SelectField>
      </div>
      <Field
        label={tProfile('location')}
        name="location"
        defaultValue={profile.location}
        placeholder="Belo Horizonte"
        maxLength={60}
      />
      <Button type="submit" disabled={pending || !hydrated}>
        {t('continue')}
      </Button>
    </form>
  );
}
