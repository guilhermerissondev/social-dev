import { buttonClasses } from '@social-dev/ui';
import { getTranslations } from 'next-intl/server';

import { Link } from '@/i18n/navigation.ts';

const features = ['code', 'stack', 'open'] as const;

export default async function HomePage() {
  const t = await getTranslations('Home');

  return (
    <div className="mx-auto max-w-5xl px-6 py-24">
      <section className="max-w-3xl">
        <h1 className="text-4xl font-bold tracking-tight text-balance sm:text-6xl">{t('title')}</h1>
        <p className="mt-6 text-lg text-pretty text-zinc-400">{t('subtitle')}</p>
        <div className="mt-10 flex flex-wrap gap-4">
          <Link href="/signup" className={buttonClasses('primary')}>
            {t('primaryCta')}
          </Link>
          <Link href="/login" className={buttonClasses('secondary')}>
            {t('secondaryCta')}
          </Link>
        </div>
      </section>

      <ul className="mt-24 grid gap-6 sm:grid-cols-3">
        {features.map((feature) => (
          <li key={feature} className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
            <h2 className="font-semibold text-zinc-100">{t(`features.${feature}.title`)}</h2>
            <p className="mt-2 text-sm text-zinc-400">{t(`features.${feature}.description`)}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
