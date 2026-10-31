import { buttonClasses } from '@social-dev/ui';
import { useTranslations } from 'next-intl';

import { Link } from '@/i18n/navigation.ts';

import { LocaleSwitcher } from './locale-switcher.tsx';

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
          <LocaleSwitcher />
          <Link href="/login" className={buttonClasses('secondary')}>
            {t('login')}
          </Link>
          <Link href="/signup" className={buttonClasses('primary')}>
            {t('signup')}
          </Link>
        </nav>
      </div>
    </header>
  );
}
