import { useTranslations } from 'next-intl';

import { Link } from '@/i18n/navigation.ts';

import { HeaderActions } from './header-actions.tsx';
import { LocaleSwitcher } from './locale-switcher.tsx';
import { SearchForm } from './search-form.tsx';

export function SiteHeader() {
  const t = useTranslations('Header');

  return (
    <header className="border-b border-zinc-800">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/" aria-label={t('home')} className="font-mono text-lg font-bold">
          <span className="text-emerald-400">&lt;</span>social.dev
          <span className="text-emerald-400">/&gt;</span>
        </Link>
        <nav className="flex items-center gap-3">
          <SearchForm />
          <LocaleSwitcher />
          <Link href="/explore" className="text-sm text-zinc-300 hover:text-zinc-100">
            {t('explore')}
          </Link>
          <HeaderActions />
        </nav>
      </div>
    </header>
  );
}
