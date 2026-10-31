import { useLocale, useTranslations } from 'next-intl';

import { getPathname } from '@/i18n/navigation.ts';

/** Header search box. A plain GET form, so it works before JavaScript loads. */
export function SearchForm() {
  const t = useTranslations('Search');
  const locale = useLocale();

  return (
    <form
      role="search"
      action={getPathname({ href: '/search', locale })}
      className="hidden sm:block"
    >
      <input
        type="search"
        name="q"
        aria-label={t('label')}
        placeholder={t('headerPlaceholder')}
        minLength={2}
        maxLength={100}
        required
        className="w-44 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:w-60 focus:border-emerald-400 focus:outline-none"
      />
    </form>
  );
}
