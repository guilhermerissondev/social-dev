import { useTranslations } from 'next-intl';

import { FollowButton } from '@/components/follow-button.tsx';
import { Avatar } from '@/components/profile/avatar.tsx';
import { Link } from '@/i18n/navigation.ts';
import type { PersonSuggestion } from '@/lib/suggestions.ts';

/** A suggested account with the reason it was suggested and a follow button. */
export function SuggestionRow({ person }: { person: PersonSuggestion }) {
  const t = useTranslations('Suggestions');

  const reason =
    person.sharedTechnologies.length > 0
      ? t('sharedStack', { tags: person.sharedTechnologies.map((tag) => `#${tag}`).join(', ') })
      : person.followedByFollowing > 0
        ? t('followedByFollowing', { count: person.followedByFollowing })
        : null;

  return (
    <li className="flex items-center gap-3 border-b border-zinc-800 py-3">
      <Avatar name={person.displayName} url={person.avatarUrl} />
      <div className="min-w-0 flex-1">
        <Link href={`/@${person.username}`} className="font-semibold text-zinc-100 hover:underline">
          {person.displayName}
        </Link>{' '}
        <span className="font-mono text-sm text-zinc-400">@{person.username}</span>
        {reason && <p className="text-xs text-emerald-400/80">{reason}</p>}
        {person.bio && <p className="line-clamp-1 text-sm text-zinc-400">{person.bio}</p>}
      </div>
      <FollowButton
        apiPath={`/api/profiles/${person.username}/follow`}
        following={false}
        fallbackHref={null}
        label={t('followLabel', { username: person.username })}
      />
    </li>
  );
}
