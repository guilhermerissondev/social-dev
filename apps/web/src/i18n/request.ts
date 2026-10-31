import { notFound } from 'next/navigation';
import * as rootParams from 'next/root-params';
import { hasLocale } from 'next-intl';
import { getRequestConfig } from 'next-intl/server';

import type messages from '../../messages/pt-BR.json';
import { routing } from './routing.ts';

type Messages = typeof messages;

export default getRequestConfig(async () => {
  const locale = await rootParams.locale();
  if (!hasLocale(routing.locales, locale)) notFound();

  return {
    locale,
    // Dates render on the server, whose clock may be UTC. Brazil first; a per-user setting comes later.
    timeZone: 'America/Sao_Paulo',
    messages: ((await import(`../../messages/${locale}.json`)) as { default: Messages }).default,
  };
});
