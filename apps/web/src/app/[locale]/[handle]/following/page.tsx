import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { FollowListPage } from '@/components/profile/follow-list-page.tsx';
import { queryValue, usernameFromSegment } from '@/lib/handles.ts';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/[handle]/following'>): Promise<Metadata> {
  const t = await getTranslations('FollowList');
  const username = usernameFromSegment((await params).handle);
  return { title: `${t('following', { username })} · Social Dev` };
}

export default async function FollowingPage({
  params,
  searchParams,
}: PageProps<'/[locale]/[handle]/following'>) {
  return (
    <FollowListPage
      handle={(await params).handle}
      direction="following"
      cursor={queryValue((await searchParams).cursor)}
    />
  );
}
