import { useTranslations } from 'next-intl';

export function SiteFooter() {
  const t = useTranslations('Footer');

  return (
    <footer className="border-t border-zinc-800">
      <p className="mx-auto max-w-5xl px-6 py-6 text-sm text-zinc-500">{t('openSource')}</p>
    </footer>
  );
}
