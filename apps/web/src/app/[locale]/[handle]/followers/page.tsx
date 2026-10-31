import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { FollowListPage } from '@/components/profile/follow-list-page.tsx';
import { queryValue, usernameFromSegment } from '@/lib/handles.ts';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/[handle]/followers'>): Promise<Metadata> {
  const t = await getTranslations('FollowList');
  const username = usernameFromSegment((await params).handle);
  return { title: `${t('followers', { username })} · Social Dev` };
}

export default async function FollowersPage({
  params,
  searchParams,
}: PageProps<'/[locale]/[handle]/followers'>) {
  return (
    <FollowListPage
      handle={(await params).handle}
      direction="followers"
      cursor={queryValue((await searchParams).cursor)}
    />
  );
}
