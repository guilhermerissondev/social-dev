'use client';

import { AREAS, normalizeTag, PROFILE_LIMITS, SENIORITIES } from '@social-dev/shared';
import { Alert, Button, Field, SelectField, TextareaField } from '@social-dev/ui';
import { useTranslations } from 'next-intl';
import { useState, type SubmitEvent } from 'react';

import { useRouter } from '@/i18n/navigation.ts';
import { apiErrorCode } from '@/lib/api-errors.ts';
import { formText } from '@/lib/form.ts';

import type { Profile } from '@/lib/profiles.ts';
import { useHydrated } from '@/lib/use-hydrated.ts';

type FormError = 'invalidTechnologies' | 'invalid' | 'unknown';

/** Splits "TypeScript, #rust go" into names. Returns the invalid ones separately. */
function parseTechnologies(value: string) {
  const entries = value.split(/[\s,]+/).filter(Boolean);
  return {
    technologies: entries,
    invalid: entries.filter((entry) => normalizeTag(entry) === null),
  };
}

export function ProfileForm({ profile }: { profile: Profile }) {
  const t = useTranslations('ProfileForm');
  const tProfile = useTranslations('Profile');
  const hydrated = useHydrated();
  const router = useRouter();
  const [error, setError] = useState<{ type: FormError; detail?: string } | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    const { technologies, invalid } = parseTechnologies(formText(form, 'technologies'));
    if (invalid.length > 0) {
      setError({ type: 'invalidTechnologies', detail: invalid.join(', ') });
      return;
    }
    if (technologies.length > PROFILE_LIMITS.technologies) {
      setError({ type: 'invalid' });
      return;
    }

    const links = Array.from({ length: PROFILE_LIMITS.links }, (_, index) => ({
      label: formText(form, `link-label-${index}`).trim(),
      url: formText(form, `link-url-${index}`).trim(),
    })).filter((link) => link.url);

    setPending(true);
    setError(null);
    const res = await fetch('/api/me/profile', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        displayName: formText(form, 'displayName'),
        bio: formText(form, 'bio'),
        location: formText(form, 'location'),
        // An empty choice means "rather not say".
        area: formText(form, 'area') || null,
        seniority: formText(form, 'seniority') || null,
        // A link without a label shows its address.
        links: links.map((link) => ({ ...link, label: link.label || t('linkDefaultLabel') })),
        technologies,
      }),
    });
    setPending(false);

    if (!res.ok) {
      setError({ type: (await apiErrorCode(res)) === 'validation_error' ? 'invalid' : 'unknown' });
      return;
    }
    router.push(`/@${profile.username}`);
    router.refresh();
  }

  return (
    <form onSubmit={(event) => void onSubmit(event)} className="flex flex-col gap-5">
      {error && (
        <Alert tone="error">{t(`errors.${error.type}`, { detail: error.detail ?? '' })}</Alert>
      )}
      <Field
        label={t('displayName')}
        name="displayName"
        defaultValue={profile.displayName}
        required
        maxLength={PROFILE_LIMITS.displayName}
      />
      <TextareaField
        label={t('bio')}
        hint={t('bioHint', { max: PROFILE_LIMITS.bio })}
        name="bio"
        rows={4}
        defaultValue={profile.bio}
        maxLength={PROFILE_LIMITS.bio}
      />
      <Field
        label={t('location')}
        name="location"
        defaultValue={profile.location}
        maxLength={PROFILE_LIMITS.location}
      />
      <div className="grid grid-cols-2 gap-3">
        <SelectField label={t('area')} name="area" defaultValue={profile.area ?? ''}>
          <option value="">{t('notSaying')}</option>
          {AREAS.map((area) => (
            <option key={area} value={area}>
              {tProfile(`areas.${area}`)}
            </option>
          ))}
        </SelectField>
        <SelectField label={t('seniority')} name="seniority" defaultValue={profile.seniority ?? ''}>
          <option value="">{t('notSaying')}</option>
          {SENIORITIES.map((seniority) => (
            <option key={seniority} value={seniority}>
              {tProfile(`seniorities.${seniority}`)}
            </option>
          ))}
        </SelectField>
      </div>
      <Field
        label={t('technologies')}
        hint={t('technologiesHint', { max: PROFILE_LIMITS.technologies })}
        name="technologies"
        defaultValue={profile.technologies.join(', ')}
        placeholder="typescript, rust, postgresql"
      />

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1.5 text-sm font-medium text-zinc-300">{t('links')}</legend>
        {Array.from({ length: PROFILE_LIMITS.links }, (_, index) => {
          const link = profile.links[index];
          return (
            <div key={index} className="grid grid-cols-[1fr_2fr] gap-2">
              <Field
                label={t('linkLabel', { number: index + 1 })}
                name={`link-label-${index}`}
                defaultValue={link?.label}
                maxLength={PROFILE_LIMITS.linkLabel}
                placeholder="GitHub"
              />
              <Field
                label={t('linkUrl', { number: index + 1 })}
                name={`link-url-${index}`}
                type="url"
                defaultValue={link?.url}
                maxLength={PROFILE_LIMITS.linkUrl}
                placeholder="https://"
              />
            </div>
          );
        })}
      </fieldset>

      <Button type="submit" disabled={pending || !hydrated}>
        {t('submit')}
      </Button>
    </form>
  );
}
