import { getTranslations } from 'next-intl/server';

import { SuggestionRow } from '@/components/onboarding/suggestion-row.tsx';
import { PostComposer } from '@/components/posts/post-composer.tsx';
import { PostList } from '@/components/posts/post-list.tsx';
import { Link } from '@/i18n/navigation.ts';
import { requireOnboardedUser } from '@/lib/guards.ts';
import { queryValue } from '@/lib/handles.ts';
import { getFeed } from '@/lib/posts.ts';
import { getPeopleSuggestions } from '@/lib/suggestions.ts';

/** Below this many posts, the feed also suggests people to follow. */
const QUIET_FEED = 5;

export default async function HomeFeedPage({ searchParams }: PageProps<'/[locale]/home'>) {
  const user = await requireOnboardedUser();
  const before = queryValue((await searchParams).before);
  const [t, feed] = await Promise.all([getTranslations('Feed'), getFeed(before)]);
  // A quiet feed gets a few people to follow on top of it.
  const suggestions =
    !before && feed.items.length < QUIET_FEED ? await getPeopleSuggestions(3) : [];

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-2xl font-bold tracking-tight">{t('title', { name: user.name })}</h1>
      {/* Older pages show only the feed. */}
      {!before && (
        <div className="mt-6">
          <PostComposer />
        </div>
      )}
      {suggestions.length > 0 && (
        <section className="mt-10" aria-labelledby="suggestions-heading">
          <h2 id="suggestions-heading" className="text-sm font-semibold text-zinc-300">
            {t('whoToFollow')}
          </h2>
          <ul className="mt-2 border-t border-zinc-800">
            {suggestions.map((person) => (
              <SuggestionRow key={person.id} person={person} />
            ))}
          </ul>
        </section>
      )}
      <section className="mt-10">
        <h2 className="border-b border-zinc-800 pb-3 text-sm font-semibold text-zinc-300">
          {t('following')}
        </h2>
        <PostList
          page={feed}
          olderHref={(cursor) => `?before=${cursor}`}
          empty={t.rich('empty', {
            explore: (chunks) => (
              <Link href="/explore" className="text-emerald-400 hover:underline">
                {chunks}
              </Link>
            ),
          })}
          // Signed in with a username: the guard above guarantees it.
          fallbackHref={null}
        />
      </section>
    </div>
  );
}
