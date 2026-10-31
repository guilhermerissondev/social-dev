import { getTranslations } from 'next-intl/server';

import { AuthCard } from '@/components/auth/auth-card.tsx';
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form.tsx';

export default async function ForgotPasswordPage() {
  const t = await getTranslations('Auth.forgotPassword');

  return (
    <AuthCard title={t('title')} subtitle={t('description')}>
      <ForgotPasswordForm />
    </AuthCard>
  );
}
