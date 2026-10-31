'use client';

import { Button } from '@social-dev/ui';
import { useTranslations } from 'next-intl';
import { useState, type SubmitEvent } from 'react';

import { useRouter } from '@/i18n/navigation.ts';
import { useHydrated } from '@/lib/use-hydrated.ts';

/** Step 2: pick tags to follow. Those from the person's stack start selected. */
export function TagsStep({ tags, preselected }: { tags: string[]; preselected: string[] }) {
  const t = useTranslations('Onboarding');
  const router = useRouter();
  const hydrated = useHydrated();
  const [pending, setPending] = useState(false);

  async function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const selected = new FormData(event.currentTarget)
      .getAll('tag')
      .filter((tag) => typeof tag === 'string');
    setPending(true);
    await Promise.all(
      selected.map((tag) =>
        fetch(`/api/tags/${encodeURIComponent(tag)}/follow`, { method: 'POST' }),
      ),
    );
    setPending(false);
    router.push('/onboarding?step=people');
  }

  return (
    <form onSubmit={(event) => void onSubmit(event)} className="flex flex-col gap-6">
      {tags.length === 0 ? (
        <p className="text-sm text-zinc-400">{t('noTags')}</p>
      ) : (
        <fieldset>
          <legend className="sr-only">{t('tagsTitle')}</legend>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <label
                key={tag}
                className="cursor-pointer rounded-full border border-zinc-700 px-3 py-1 font-mono text-sm text-zinc-200 has-checked:border-emerald-400 has-checked:text-emerald-300"
              >
                <input
                  type="checkbox"
                  name="tag"
                  value={tag}
                  defaultChecked={preselected.includes(tag)}
                  className="sr-only"
                />
                #{tag}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      <Button type="submit" disabled={pending || !hydrated}>
        {t('continue')}
      </Button>
    </form>
  );
}
