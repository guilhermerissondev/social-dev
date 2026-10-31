import { useTranslations } from 'next-intl';

import { SOURCE_CODE_URL } from '@/lib/site.ts';

export function SiteFooter() {
  const t = useTranslations('Footer');

  return (
    <footer className="border-t border-zinc-800">
      <p className="mx-auto max-w-5xl px-6 py-6 text-sm text-zinc-500">
        {t('openSource')}{' '}
        <a href={SOURCE_CODE_URL} className="text-zinc-300 hover:text-emerald-400 hover:underline">
          {t('sourceCode')}
        </a>
      </p>
    </footer>
  );
}
