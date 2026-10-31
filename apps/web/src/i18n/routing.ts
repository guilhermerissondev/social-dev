import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['pt-BR', 'en'],
  defaultLocale: 'pt-BR',
  // Portuguese URLs have no prefix (/), other languages do (/en).
  localePrefix: 'as-needed',
});

export type Locale = (typeof routing.locales)[number];
