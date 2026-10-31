import { useTranslations } from 'next-intl';

import type { PostPage } from '@/lib/posts.ts';

import { PostCard } from './post-card.tsx';

/** A page of posts with a link to older ones. `olderHref` receives the cursor. */
export function PostList({
  page,
  olderHref,
  empty,
  fallbackHref,
}: {
  page: PostPage;
  olderHref: (cursor: string) => string;
  empty: string;
  fallbackHref: '/login' | '/welcome' | null;
}) {
  const t = useTranslations('Post');

  if (page.items.length === 0) {
    return <p className="py-10 text-center text-sm text-zinc-500">{empty}</p>;
  }

  return (
    <div>
      {page.items.map((post) => (
        <PostCard
          key={post.entryId}
          post={post}
          repostedBy={post.repostedBy}
          fallbackHref={fallbackHref}
        />
      ))}
      {page.nextCursor && (
        <div className="py-6 text-center">
          {/* A plain link keeps paging working without JavaScript and crawlable. */}
          <a href={olderHref(page.nextCursor)} className="text-sm text-emerald-400 hover:underline">
            {t('older')}
          </a>
        </div>
      )}
    </div>
  );
}
