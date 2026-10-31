import { Link } from '@/i18n/navigation.ts';
import type { ProfileSummary } from '@/lib/profiles.ts';

import { Avatar } from './avatar.tsx';

/** One account in a list, linking to its profile. */
export function ProfileRow({ profile }: { profile: ProfileSummary }) {
  return (
    <li className="border-b border-zinc-800">
      <Link
        href={`/@${profile.username}`}
        className="flex items-start gap-3 py-4 hover:bg-zinc-900/50"
      >
        <Avatar name={profile.displayName} url={profile.avatarUrl} />
        <div className="min-w-0">
          <p className="font-semibold text-zinc-100">{profile.displayName}</p>
          <p className="font-mono text-sm text-zinc-400">@{profile.username}</p>
          {profile.bio && <p className="mt-1 line-clamp-2 text-sm text-zinc-300">{profile.bio}</p>}
        </div>
      </Link>
    </li>
  );
}
