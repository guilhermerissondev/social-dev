import { getTranslations } from 'next-intl/server';

import { requireUser } from '@/lib/guards.ts';

export default async function HomeFeedPage() {
  const user = await requireUser();
  const t = await getTranslations('Feed');

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-2xl font-bold tracking-tight">{t('title', { name: user.name })}</h1>
      <p className="mt-2 text-zinc-400">{t('description')}</p>
    </div>
  );
}
