import { cn } from '@social-dev/ui';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { PostList } from '@/components/posts/post-list.tsx';
import { ProfileRow } from '@/components/profile/profile-row.tsx';
import { Link } from '@/i18n/navigation.ts';
import { queryValue } from '@/lib/handles.ts';
import { isSearchType, search, searchTypes, type SearchType } from '@/lib/search.ts';
import { actionFallbackHref } from '@/lib/viewer.ts';

export async function generateMetadata({
  searchParams,
}: PageProps<'/[locale]/search'>): Promise<Metadata> {
  const t = await getTranslations('Search');
  const q = queryValue((await searchParams).q)?.trim();
  return {
    title: `${q ? t('titleFor', { q }) : t('title')} · Social Dev`,
    robots: { index: false },
  };
}

function searchQuery(q: string, type: SearchType, cursor?: string) {
  const query = new URLSearchParams({ q });
  if (type !== 'all') query.set('type', type);
  if (cursor) query.set('cursor', cursor);
  return `?${query.toString()}`;
}

export default async function SearchPage({ searchParams }: PageProps<'/[locale]/search'>) {
  const params = await searchParams;
  const q = queryValue(params.q)?.trim() ?? '';
  const typeParam = queryValue(params.type);
  const type: SearchType = isSearchType(typeParam) ? typeParam : 'all';
  const cursor = queryValue(params.cursor);
  const valid = q.length >= 2 && q.length <= 100;

  const [t, results, fallbackHref] = await Promise.all([
    getTranslations('Search'),
    valid ? search(q, type, cursor) : null,
    actionFallbackHref(),
  ]);

  const tabClasses = (active: boolean) =>
    cn(
      'rounded-full border px-3 py-1 text-sm',
      active
        ? 'border-emerald-400 text-emerald-300'
        : 'border-zinc-700 text-zinc-300 hover:border-zinc-500',
    );
  const noResults =
    results?.people.length === 0 && results.tags.length === 0 && results.posts.items.length === 0;

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-2xl font-bold tracking-tight">{q ? t('titleFor', { q }) : t('title')}</h1>

      <form role="search" className="mt-6 flex gap-2">
        <input
          type="search"
          name="q"
          defaultValue={q}
          aria-label={t('label')}
          placeholder={t('placeholder')}
          minLength={2}
          maxLength={100}
          required
          className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-emerald-400 focus:outline-none"
        />
        {type !== 'all' && <input type="hidden" name="type" value={type} />}
      </form>
      <p className="mt-2 text-xs text-zinc-500">{t('syntaxHint')}</p>

      {valid && (
        <nav aria-label={t('typeLabel')} className="mt-6 flex gap-2">
          {searchTypes.map((option) => (
            <Link
              key={option}
              href={`/search${searchQuery(q, option)}`}
              aria-current={option === type ? 'page' : undefined}
              className={tabClasses(option === type)}
            >
              {t(`types.${option}`)}
            </Link>
          ))}
        </nav>
      )}

      {!valid && q && <p className="mt-6 text-sm text-zinc-400">{t('tooShort')}</p>}
      {noResults && <p className="mt-10 text-center text-sm text-zinc-500">{t('noResults')}</p>}

      {results && results.people.length > 0 && (
        <section className="mt-8" aria-labelledby="people-heading">
          <h2 id="people-heading" className="text-sm font-semibold text-zinc-300">
            {t('types.people')}
          </h2>
          <ul className="mt-2 border-t border-zinc-800">
            {results.people.map((person) => (
              <ProfileRow key={person.id} profile={person} />
            ))}
          </ul>
        </section>
      )}

      {results && results.tags.length > 0 && (
        <section className="mt-8" aria-labelledby="tags-heading">
          <h2 id="tags-heading" className="text-sm font-semibold text-zinc-300">
            {t('types.tags')}
          </h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {results.tags.map((tag) => (
              <li key={tag.name}>
                <Link href={`/tags/${tag.name}`} className={cn(tabClasses(false), 'font-mono')}>
                  #{tag.name}{' '}
                  <span className="text-zinc-500">{t('tagPosts', { count: tag.postsCount })}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {results && results.posts.items.length > 0 && (
        <section className="mt-8" aria-labelledby="posts-heading">
          <h2 id="posts-heading" className="text-sm font-semibold text-zinc-300">
            {t('types.posts')}
          </h2>
          <div className="border-t border-zinc-800">
            <PostList
              page={results.posts}
              olderHref={(next) => searchQuery(q, 'posts', next)}
              empty={null}
              fallbackHref={fallbackHref}
              moreLabel={t('more')}
            />
          </div>
        </section>
      )}
    </div>
  );
}
