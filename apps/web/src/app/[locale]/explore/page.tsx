import { normalizeTag } from '@social-dev/shared';
import { cn } from '@social-dev/ui';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { PostList } from '@/components/posts/post-list.tsx';
import { Link } from '@/i18n/navigation.ts';
import {
  explorePeriods,
  getPopularPosts,
  getTrendingTags,
  isExplorePeriod,
  type ExplorePeriod,
} from '@/lib/explore.ts';
import { queryValue } from '@/lib/handles.ts';
import { actionFallbackHref } from '@/lib/viewer.ts';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Explore');
  return { title: `${t('title')} · Social Dev`, description: t('subtitle') };
}

/** Query string for this page, keeping only what is set. */
function exploreQuery(period: ExplorePeriod, tag: string | null, cursor?: string) {
  const query = new URLSearchParams({ period });
  if (tag) query.set('tag', tag);
  if (cursor) query.set('cursor', cursor);
  return `?${query.toString()}`;
}

export default async function ExplorePage({ searchParams }: PageProps<'/[locale]/explore'>) {
  const params = await searchParams;
  const periodParam = queryValue(params.period);
  const period: ExplorePeriod = isExplorePeriod(periodParam) ? periodParam : 'week';
  const tagParam = queryValue(params.tag);
  const tag = tagParam ? normalizeTag(tagParam) : null;
  const cursor = queryValue(params.cursor);

  const [t, posts, trending, fallbackHref] = await Promise.all([
    getTranslations('Explore'),
    getPopularPosts(period, tag ?? undefined, cursor),
    getTrendingTags(period),
    actionFallbackHref(),
  ]);

  const chipClasses = (active: boolean) =>
    cn(
      'rounded-full border px-3 py-1 text-sm',
      active
        ? 'border-emerald-400 text-emerald-300'
        : 'border-zinc-700 text-zinc-300 hover:border-zinc-500',
    );

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
      <p className="mt-2 text-sm text-zinc-400">{t('subtitle')}</p>

      <nav aria-label={t('periodLabel')} className="mt-6 flex gap-2">
        {explorePeriods.map((option) => (
          <Link
            key={option}
            href={`/explore${exploreQuery(option, tag)}`}
            aria-current={option === period ? 'page' : undefined}
            className={chipClasses(option === period)}
          >
            {t(`periods.${option}`)}
          </Link>
        ))}
      </nav>

      {trending.length > 0 && (
        <section className="mt-6" aria-labelledby="trending-heading">
          <h2 id="trending-heading" className="text-sm font-semibold text-zinc-300">
            {t('trending')}
          </h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {trending.map((item) => (
              <li key={item.name}>
                <Link
                  href={`/explore${exploreQuery(period, item.name)}`}
                  aria-current={item.name === tag ? 'true' : undefined}
                  className={cn(chipClasses(item.name === tag), 'font-mono')}
                >
                  #{item.name} <span className="text-zinc-500">{item.postsCount}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {tag && (
        <p className="mt-6 text-sm text-zinc-400">
          {t.rich('filteringBy', {
            tag: () => <span className="font-mono text-zinc-100">#{tag}</span>,
          })}{' '}
          <Link
            href={`/explore${exploreQuery(period, null)}`}
            className="text-emerald-400 hover:underline"
          >
            {t('clearFilter')}
          </Link>
        </p>
      )}

      <div className="mt-6 border-t border-zinc-800">
        <PostList
          page={posts}
          olderHref={(next) => exploreQuery(period, tag, next)}
          empty={t('empty')}
          fallbackHref={fallbackHref}
          moreLabel={t('more')}
        />
      </div>
    </div>
  );
}
