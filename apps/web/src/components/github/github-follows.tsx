import { useTranslations } from 'next-intl';

import { FollowButton } from '@/components/follow-button.tsx';
import { Avatar } from '@/components/profile/avatar.tsx';
import { Link } from '@/i18n/navigation.ts';
import type { GitHubFollow } from '@/lib/github.ts';

import { FollowAllFromGitHubButton } from './follow-all-button.tsx';

/** People on Social Dev the viewer follows on GitHub, with a button to follow them all. */
export function GitHubFollows({ people }: { people: GitHubFollow[] }) {
  const t = useTranslations('GitHub');
  const pending = people.filter((person) => !person.followedByViewer).length;

  if (people.length === 0) return <p className="text-sm text-zinc-400">{t('noFollows')}</p>;

  return (
    <div className="flex flex-col gap-4">
      <ul className="border-t border-zinc-800">
        {people.map((person) => (
          <li key={person.id} className="flex items-center gap-3 border-b border-zinc-800 py-3">
            <Avatar name={person.displayName} url={person.avatarUrl} />
            <div className="min-w-0 flex-1">
              <Link
                href={`/@${person.username}`}
                className="font-semibold text-zinc-100 hover:underline"
              >
                {person.displayName}
              </Link>{' '}
              <span className="font-mono text-sm text-zinc-400">@{person.username}</span>
            </div>
            <FollowButton
              apiPath={`/api/profiles/${person.username}/follow`}
              following={person.followedByViewer}
              fallbackHref={null}
              label={t('followLabel', { username: person.username })}
            />
          </li>
        ))}
      </ul>
      <div>
        <FollowAllFromGitHubButton count={pending} />
      </div>
    </div>
  );
}
