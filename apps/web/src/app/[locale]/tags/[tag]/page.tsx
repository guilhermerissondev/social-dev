import { normalizeTag } from '@social-dev/shared';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { PostList } from '@/components/posts/post-list.tsx';
import { queryValue } from '@/lib/handles.ts';
import { listTagPosts } from '@/lib/posts.ts';

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
  const [t, posts] = await Promise.all([getTranslations('Tag'), listTagPosts(tag, before)]);

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="border-b border-zinc-800 pb-4 font-mono text-2xl font-bold">#{tag}</h1>
      <PostList page={posts} olderHref={(cursor) => `?before=${cursor}`} empty={t('noPosts')} />
    </div>
  );
}
