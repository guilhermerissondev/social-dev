import { useFormatter, useTranslations } from 'next-intl';

import type { PinnedRepo } from '@/lib/github.ts';

/** Repositories pinned on GitHub, as cards linking to GitHub. */
export function PinnedRepos({ repos }: { repos: PinnedRepo[] }) {
  const t = useTranslations('GitHub');
  const format = useFormatter();

  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {repos.map((repo) => (
        <li key={repo.nameWithOwner} className="rounded-lg border border-zinc-800 p-4">
          <a
            href={repo.url}
            rel="nofollow noopener noreferrer"
            target="_blank"
            className="font-mono text-sm font-semibold text-emerald-400 hover:underline"
          >
            {repo.name}
          </a>
          {repo.description && (
            <p className="mt-1 line-clamp-2 text-sm text-zinc-300">{repo.description}</p>
          )}
          <p className="mt-2 flex items-center gap-3 text-xs text-zinc-400">
            {repo.language && (
              <span className="flex items-center gap-1.5">
                <span
                  aria-hidden
                  className="size-2.5 rounded-full bg-zinc-500"
                  // The API only lets through colors in the #rrggbb format.
                  style={repo.language.color ? { backgroundColor: repo.language.color } : undefined}
                />
                {repo.language.name}
              </span>
            )}
            <span>{t('stars', { count: repo.stars, formatted: format.number(repo.stars) })}</span>
          </p>
        </li>
      ))}
    </ul>
  );
}
