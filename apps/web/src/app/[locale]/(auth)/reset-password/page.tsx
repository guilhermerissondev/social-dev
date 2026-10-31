import { getTranslations } from 'next-intl/server';

import { AuthCard } from '@/components/auth/auth-card.tsx';
import { ResetPasswordForm } from '@/components/auth/reset-password-form.tsx';

export default async function ResetPasswordPage({
  searchParams,
}: PageProps<'/[locale]/reset-password'>) {
  const t = await getTranslations('Auth.resetPassword');
  const { token, error } = await searchParams;
  const validToken = typeof token === 'string' && !error ? token : null;

  return (
    <AuthCard title={t('title')}>
      <ResetPasswordForm token={validToken} />
    </AuthCard>
  );
}
