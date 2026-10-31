import { getTranslations } from 'next-intl/server';

import { PostComposer } from '@/components/posts/post-composer.tsx';
import { requireUserWithUsername } from '@/lib/guards.ts';

export default async function HomeFeedPage() {
  const user = await requireUserWithUsername();
  const t = await getTranslations('Feed');

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-2xl font-bold tracking-tight">{t('title', { name: user.name })}</h1>
      <div className="mt-6">
        <PostComposer />
      </div>
      <p className="mt-10 text-center text-sm text-zinc-500">{t('description')}</p>
    </div>
  );
}
