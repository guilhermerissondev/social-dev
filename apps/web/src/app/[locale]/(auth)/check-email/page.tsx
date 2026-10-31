import { getTranslations } from 'next-intl/server';

import { AuthCard } from '@/components/auth/auth-card.tsx';
import { Link } from '@/i18n/navigation.ts';

export default async function CheckEmailPage() {
  const t = await getTranslations('Auth.checkEmail');

  return (
    <AuthCard title={t('title')} subtitle={t('description')}>
      <Link href="/login" className="text-sm text-emerald-400 hover:underline">
        {t('back')}
      </Link>
    </AuthCard>
  );
}
