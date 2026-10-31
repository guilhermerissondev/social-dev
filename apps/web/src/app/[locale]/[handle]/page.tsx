import { buttonClasses } from '@social-dev/ui';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getFormatter, getTranslations } from 'next-intl/server';

import { FollowButton } from '@/components/follow-button.tsx';
import { PostList } from '@/components/posts/post-list.tsx';
import { Avatar } from '@/components/profile/avatar.tsx';
import { Link } from '@/i18n/navigation.ts';
import { queryValue, usernameFromSegment } from '@/lib/handles.ts';
import { listProfilePosts } from '@/lib/posts.ts';
import { getProfile } from '@/lib/profiles.ts';
import { getSessionUser } from '@/lib/session.ts';
import { followFallbackHref } from '@/lib/viewer.ts';

/** Profiles live at /@username. Any other single segment is not a page. */
async function profileFromParams(params: PageProps<'/[locale]/[handle]'>['params']) {
  const profile = await getProfile(usernameFromSegment((await params).handle));
  if (!profile) notFound();
  return profile;
}

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/[handle]'>): Promise<Metadata> {
  const profile = await profileFromParams(params);
  return {
    title: `${profile.displayName} (@${profile.username}) · Social Dev`,
    description: profile.bio || undefined,
  };
}

export default async function ProfilePage({
  params,
  searchParams,
}: PageProps<'/[locale]/[handle]'>) {
  const profile = await profileFromParams(params);
  const before = queryValue((await searchParams).before);
  const [t, format, viewer, posts, fallbackHref] = await Promise.all([
    getTranslations('Profile'),
    getFormatter(),
    getSessionUser(),
    listProfilePosts(profile.username, before),
    followFallbackHref(),
  ]);
  const isOwner = viewer?.username === profile.username.toLowerCase();

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <header className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar name={profile.displayName} url={profile.avatarUrl} size="lg" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{profile.displayName}</h1>
            <p className="font-mono text-zinc-400">@{profile.username}</p>
          </div>
        </div>
        {isOwner ? (
          <Link href="/settings/profile" className={buttonClasses('secondary')}>
            {t('edit')}
          </Link>
        ) : (
          <FollowButton
            apiPath={`/api/profiles/${profile.username}/follow`}
            following={profile.followedByViewer}
            fallbackHref={fallbackHref}
            label={t('followLabel', { username: profile.username })}
          />
        )}
      </header>

      <p className="mt-6 flex gap-5 text-sm text-zinc-400">
        <Link href={`/@${profile.username}/following`} className="hover:underline">
          {t.rich('followingCount', {
            count: profile.followingCount,
            strong: (chunks) => <strong className="text-zinc-100">{chunks}</strong>,
          })}
        </Link>
        <Link href={`/@${profile.username}/followers`} className="hover:underline">
          {t.rich('followersCount', {
            count: profile.followersCount,
            strong: (chunks) => <strong className="text-zinc-100">{chunks}</strong>,
          })}
        </Link>
      </p>

      {profile.bio && <p className="mt-4 whitespace-pre-line text-zinc-200">{profile.bio}</p>}

      <dl className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-zinc-400">
        {profile.location && (
          <div className="flex gap-1.5">
            <dt>{t('location')}:</dt>
            <dd className="text-zinc-200">{profile.location}</dd>
          </div>
        )}
        <div className="flex gap-1.5">
          <dt>{t('joined')}:</dt>
          <dd className="text-zinc-200">
            {format.dateTime(new Date(profile.createdAt), { month: 'long', year: 'numeric' })}
          </dd>
        </div>
      </dl>

      {profile.links.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
          {profile.links.map((link) => (
            <li key={link.url}>
              <span className="text-zinc-400">{link.label}: </span>
              <a
                href={link.url}
                rel="me nofollow noopener noreferrer"
                target="_blank"
                className="text-emerald-400 hover:underline"
              >
                {link.url.replace(/^https?:\/\//, '')}
              </a>
            </li>
          ))}
        </ul>
      )}

      {profile.technologies.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-semibold text-zinc-300">{t('stack')}</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {profile.technologies.map((tech) => (
              <li key={tech}>
                <Link
                  href={`/tags/${tech}`}
                  className="block rounded-full border border-zinc-700 px-3 py-1 font-mono text-xs text-zinc-200 hover:border-emerald-400"
                >
                  #{tech}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-12">
        <h2 className="border-b border-zinc-800 pb-3 text-sm font-semibold text-zinc-300">
          {t('posts')}
        </h2>
        <PostList page={posts} olderHref={(cursor) => `?before=${cursor}`} empty={t('noPosts')} />
      </section>
    </div>
  );
}
