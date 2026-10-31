import { Alert } from '@social-dev/ui';
import type { Metadata } from 'next';
import { getFormatter, getTranslations } from 'next-intl/server';

import { ConnectGitHubButton } from '@/components/github/connect-button.tsx';
import { GitHubFollows } from '@/components/github/github-follows.tsx';
import { GitHubSettings } from '@/components/github/github-settings.tsx';
import { PinnedRepos } from '@/components/github/pinned-repos.tsx';
import { getGitHubFollows, getGitHubStatus } from '@/lib/github.ts';
import { queryValue } from '@/lib/handles.ts';
import { requireUserWithUsername } from '@/lib/guards.ts';
import { getAuthProviders } from '@/lib/session.ts';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('GitHub');
  return { title: `${t('title')} · Social Dev`, robots: { index: false } };
}

/** Linking errors Better Auth reports with ?error=, with their own explanation. */
const knownLinkErrors = [
  'email_does_not_match',
  'account_already_linked_to_different_user',
] as const;

export default async function GitHubSettingsPage({
  searchParams,
}: PageProps<'/[locale]/settings/github'>) {
  await requireUserWithUsername();
  const errorParam = queryValue((await searchParams).error);
  const linkError = errorParam
    ? (knownLinkErrors.find((code) => code === errorParam) ?? 'unknown')
    : null;
  const [t, format, status, providers] = await Promise.all([
    getTranslations('GitHub'),
    getFormatter(),
    getGitHubStatus(),
    getAuthProviders(),
  ]);
  const follows = status.connected ? await getGitHubFollows() : null;

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
      <p className="mt-2 text-sm text-zinc-400">{t('subtitle')}</p>
      {linkError && (
        <div className="mt-6">
          <Alert tone="error">{t(`linkErrors.${linkError}`)}</Alert>
        </div>
      )}

      {!status.connected ? (
        <div className="mt-8 flex flex-col items-start gap-4">
          <p className="text-sm text-zinc-300">{t('notConnected')}</p>
          {providers.includes('github') ? (
            <ConnectGitHubButton />
          ) : (
            <p className="text-sm text-zinc-500">{t('notConfigured')}</p>
          )}
        </div>
      ) : (
        <>
          <section className="mt-8" aria-labelledby="github-account-heading">
            <h2 id="github-account-heading" className="text-sm font-semibold text-zinc-300">
              {t('account')}
            </h2>
            <p className="mt-2 text-sm text-zinc-200">
              {t.rich('connectedAs', {
                login: status.login ?? '',
                link: (chunks) => (
                  <a
                    href={`https://github.com/${status.login ?? ''}`}
                    rel="noopener noreferrer"
                    target="_blank"
                    className="font-mono text-emerald-400 hover:underline"
                  >
                    {chunks}
                  </a>
                ),
              })}
              {status.fetchedAt && (
                <span className="text-zinc-500">
                  {' · '}
                  {t('fetchedAt', { when: format.relativeTime(new Date(status.fetchedAt)) })}
                </span>
              )}
            </p>
            <div className="mt-4">
              <GitHubSettings showOnProfile={status.showOnProfile} />
            </div>
          </section>

          <section className="mt-10" aria-labelledby="pinned-heading">
            <h2 id="pinned-heading" className="text-sm font-semibold text-zinc-300">
              {t('pinned')}
            </h2>
            <div className="mt-3">
              {status.pinnedRepos.length > 0 ? (
                <PinnedRepos repos={status.pinnedRepos} />
              ) : (
                <p className="text-sm text-zinc-400">{t('noPinned')}</p>
              )}
            </div>
          </section>

          <section className="mt-10" aria-labelledby="follows-heading">
            <h2 id="follows-heading" className="text-sm font-semibold text-zinc-300">
              {t('follows')}
            </h2>
            <div className="mt-3">
              {follows ? (
                <GitHubFollows people={follows} />
              ) : (
                <p className="text-sm text-zinc-400">{t('followsUnavailable')}</p>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
