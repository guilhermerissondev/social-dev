import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { PostList } from '@/components/posts/post-list.tsx';
import { requireUserWithUsername } from '@/lib/guards.ts';
import { queryValue } from '@/lib/handles.ts';
import { getBookmarks } from '@/lib/posts.ts';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Saved');
  return { title: `${t('title')} · Social Dev`, robots: { index: false } };
}

export default async function SavedPage({ searchParams }: PageProps<'/[locale]/saved'>) {
  await requireUserWithUsername();
  const cursor = queryValue((await searchParams).cursor);
  const [t, page] = await Promise.all([getTranslations('Saved'), getBookmarks(cursor)]);

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
      <p className="mt-2 border-b border-zinc-800 pb-4 text-sm text-zinc-400">{t('subtitle')}</p>
      <PostList
        page={page}
        olderHref={(next) => `?cursor=${encodeURIComponent(next)}`}
        empty={t('empty')}
        fallbackHref={null}
      />
    </div>
  );
}
