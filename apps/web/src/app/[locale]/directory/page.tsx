import { AREAS, normalizeTag, SENIORITIES, type Area, type Seniority } from '@social-dev/shared';
import { Button, Field, SelectField } from '@social-dev/ui';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { Avatar } from '@/components/profile/avatar.tsx';
import { Link } from '@/i18n/navigation.ts';
import { directoryQuery, getDirectory, type DirectoryFilters } from '@/lib/directory.ts';
import { queryValue } from '@/lib/handles.ts';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Directory');
  return { title: `${t('title')} · Social Dev`, description: t('subtitle') };
}

function oneOf<T extends string>(options: readonly T[], value: string | undefined): T | undefined {
  return options.find((option) => option === value);
}

export default async function DirectoryPage({ searchParams }: PageProps<'/[locale]/directory'>) {
  const params = await searchParams;
  const techParam = queryValue(params.tech)?.trim();
  const location = queryValue(params.location)?.trim().slice(0, 60);
  const filters: DirectoryFilters = {
    tech: techParam ? (normalizeTag(techParam) ?? techParam) : undefined,
    area: oneOf<Area>(AREAS, queryValue(params.area)),
    seniority: oneOf<Seniority>(SENIORITIES, queryValue(params.seniority)),
    location: location === '' ? undefined : location,
  };
  const cursor = queryValue(params.cursor);

  const [t, tProfile, page] = await Promise.all([
    getTranslations('Directory'),
    getTranslations('Profile'),
    getDirectory(filters, cursor),
  ]);
  const filtered = Object.values(filters).some(Boolean);

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
      <p className="mt-2 text-sm text-zinc-400">{t('subtitle')}</p>

      {/* A plain GET form: filters live in the URL, so results can be shared. */}
      <form className="mt-6 grid gap-3 sm:grid-cols-[1fr_1fr_1fr_1fr_auto] sm:items-end">
        <Field
          label={t('tech')}
          name="tech"
          defaultValue={filters.tech}
          placeholder={t('techPlaceholder')}
        />
        <SelectField label={t('area')} name="area" defaultValue={filters.area ?? ''}>
          <option value="">{t('any')}</option>
          {AREAS.map((area) => (
            <option key={area} value={area}>
              {tProfile(`areas.${area}`)}
            </option>
          ))}
        </SelectField>
        <SelectField label={t('seniority')} name="seniority" defaultValue={filters.seniority ?? ''}>
          <option value="">{t('any')}</option>
          {SENIORITIES.map((seniority) => (
            <option key={seniority} value={seniority}>
              {tProfile(`seniorities.${seniority}`)}
            </option>
          ))}
        </SelectField>
        <Field
          label={t('location')}
          name="location"
          defaultValue={filters.location}
          placeholder={t('locationPlaceholder')}
          maxLength={60}
        />
        <Button type="submit">{t('submit')}</Button>
      </form>
      {filtered && (
        <Link
          href="/directory"
          className="mt-3 inline-block text-sm text-emerald-400 hover:underline"
        >
          {t('clear')}
        </Link>
      )}

      {page.items.length === 0 ? (
        <p className="py-10 text-center text-sm text-zinc-500">{t('empty')}</p>
      ) : (
        <ul className="mt-6 border-t border-zinc-800">
          {page.items.map((entry) => (
            <li key={entry.id} className="border-b border-zinc-800 py-4">
              <div className="flex items-start gap-3">
                <Avatar name={entry.displayName} url={entry.avatarUrl} />
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/@${entry.username}`}
                    className="font-semibold text-zinc-100 hover:underline"
                  >
                    {entry.displayName}
                  </Link>{' '}
                  <span className="font-mono text-sm text-zinc-400">@{entry.username}</span>
                  <p className="text-sm text-zinc-400">
                    {[
                      entry.area && tProfile(`areas.${entry.area}`),
                      entry.seniority && tProfile(`seniorities.${entry.seniority}`),
                      entry.location,
                      t('followers', { count: entry.followersCount }),
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                  {entry.bio && (
                    <p className="mt-1 line-clamp-2 text-sm text-zinc-300">{entry.bio}</p>
                  )}
                  {entry.technologies.length > 0 && (
                    <ul className="mt-2 flex flex-wrap gap-1.5">
                      {entry.technologies.map((tech) => (
                        <li key={tech}>
                          <Link
                            href={`/directory${directoryQuery({ ...filters, tech })}`}
                            className="rounded-full border border-zinc-700 px-2 py-0.5 font-mono text-xs text-zinc-300 hover:border-emerald-400"
                          >
                            #{tech}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {page.nextCursor && (
        <div className="py-6 text-center">
          <a
            href={directoryQuery(filters, page.nextCursor) || '?'}
            className="text-sm text-emerald-400 hover:underline"
          >
            {t('more')}
          </a>
        </div>
      )}
    </div>
  );
}
