'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useTransition } from 'react';

import { usePathname, useRouter } from '@/i18n/navigation.ts';
import { type Locale, routing } from '@/i18n/routing.ts';

const labels: Record<Locale, string> = {
  'pt-BR': 'Português',
  en: 'English',
};

export function LocaleSwitcher() {
  const t = useTranslations('Header');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  return (
    <select
      aria-label={t('language')}
      value={locale}
      disabled={isPending}
      onChange={(event) => {
        const next = event.target.value as Locale;
        startTransition(() => {
          router.replace(pathname, { locale: next });
        });
      }}
      className="rounded-md border border-zinc-700 bg-zinc-950 px-2 py-2 text-sm text-zinc-300"
    >
      {routing.locales.map((value) => (
        <option key={value} value={value}>
          {labels[value]}
        </option>
      ))}
    </select>
  );
}
