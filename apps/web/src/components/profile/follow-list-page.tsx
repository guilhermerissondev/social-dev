import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { Link } from '@/i18n/navigation.ts';
import { usernameFromSegment } from '@/lib/handles.ts';
import { getProfile, listFollows } from '@/lib/profiles.ts';

import { ProfileRow } from './profile-row.tsx';

/** Shared page for /@username/followers and /@username/following. */
export async function FollowListPage({
  handle,
  direction,
  cursor,
}: {
  handle: string;
  direction: 'followers' | 'following';
  cursor: string | undefined;
}) {
  const username = usernameFromSegment(handle);
  const [t, profile, page] = await Promise.all([
    getTranslations('FollowList'),
    getProfile(username),
    listFollows(username, direction, cursor),
  ]);
  if (!profile || !page) notFound();

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <Link href={`/@${profile.username}`} className="text-sm text-zinc-400 hover:underline">
        ← {profile.displayName}
      </Link>
      <h1 className="mt-2 border-b border-zinc-800 pb-4 text-2xl font-bold tracking-tight">
        {t(direction, { username: profile.username })}
      </h1>
      {page.items.length === 0 ? (
        <p className="py-10 text-center text-sm text-zinc-500">{t(`${direction}Empty`)}</p>
      ) : (
        <ul>
          {page.items.map((item) => (
            <ProfileRow key={item.id} profile={item} />
          ))}
        </ul>
      )}
      {page.nextCursor && (
        <div className="py-6 text-center">
          <a
            href={`?cursor=${encodeURIComponent(page.nextCursor)}`}
            className="text-sm text-emerald-400 hover:underline"
          >
            {t('more')}
          </a>
        </div>
      )}
    </div>
  );
}
