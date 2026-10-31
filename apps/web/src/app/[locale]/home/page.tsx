import { getTranslations } from 'next-intl/server';

import { PostComposer } from '@/components/posts/post-composer.tsx';
import { PostList } from '@/components/posts/post-list.tsx';
import { requireUserWithUsername } from '@/lib/guards.ts';
import { queryValue } from '@/lib/handles.ts';
import { getFeed } from '@/lib/posts.ts';

export default async function HomeFeedPage({ searchParams }: PageProps<'/[locale]/home'>) {
  const user = await requireUserWithUsername();
  const before = queryValue((await searchParams).before);
  const [t, feed] = await Promise.all([getTranslations('Feed'), getFeed(before)]);

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-2xl font-bold tracking-tight">{t('title', { name: user.name })}</h1>
      {/* Older pages show only the feed. */}
      {!before && (
        <div className="mt-6">
          <PostComposer />
        </div>
      )}
      <section className="mt-10">
        <h2 className="border-b border-zinc-800 pb-3 text-sm font-semibold text-zinc-300">
          {t('following')}
        </h2>
        <PostList
          page={feed}
          olderHref={(cursor) => `?before=${cursor}`}
          empty={t('empty')}
          // Signed in with a username: the guard above guarantees it.
          fallbackHref={null}
        />
      </section>
    </div>
  );
}
