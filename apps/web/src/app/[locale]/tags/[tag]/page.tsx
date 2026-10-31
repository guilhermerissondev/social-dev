import { normalizeTag } from '@social-dev/shared';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { FollowButton } from '@/components/follow-button.tsx';
import { PostList } from '@/components/posts/post-list.tsx';
import { queryValue } from '@/lib/handles.ts';
import { listTagPosts } from '@/lib/posts.ts';
import { getTag } from '@/lib/tags.ts';
import { actionFallbackHref } from '@/lib/viewer.ts';

async function tagFromParams(params: PageProps<'/[locale]/tags/[tag]'>['params']) {
  const tag = normalizeTag(decodeURIComponent((await params).tag));
  if (!tag) notFound();
  return tag;
}

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/tags/[tag]'>): Promise<Metadata> {
  return { title: `#${await tagFromParams(params)} · Social Dev` };
}

export default async function TagPage({ params, searchParams }: PageProps<'/[locale]/tags/[tag]'>) {
  const tag = await tagFromParams(params);
  const before = queryValue((await searchParams).before);
  const [t, info, posts, fallbackHref] = await Promise.all([
    getTranslations('Tag'),
    getTag(tag),
    listTagPosts(tag, before),
    actionFallbackHref(),
  ]);
  if (!info) notFound();

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <header className="flex items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div>
          <h1 className="font-mono text-2xl font-bold">#{tag}</h1>
          <p className="mt-1 text-sm text-zinc-400">
            {t('followersCount', { count: info.followersCount })}
          </p>
        </div>
        <FollowButton
          apiPath={`/api/tags/${tag}/follow`}
          following={info.followedByViewer}
          fallbackHref={fallbackHref}
          label={t('followLabel', { tag })}
        />
      </header>
      <PostList
        page={posts}
        olderHref={(cursor) => `?before=${cursor}`}
        empty={t('noPosts')}
        fallbackHref={fallbackHref}
      />
    </div>
  );
}
