'use client';

import { Button } from '@social-dev/ui';
import { useState } from 'react';

import { useRouter } from '@/i18n/navigation.ts';
import { useHydrated } from '@/lib/use-hydrated.ts';

/** Marks onboarding as done and opens the feed. Also used to skip it. */
export function FinishOnboardingButton({
  label,
  variant = 'primary',
}: {
  label: string;
  variant?: 'primary' | 'secondary';
}) {
  const router = useRouter();
  const hydrated = useHydrated();
  const [pending, setPending] = useState(false);

  async function finish() {
    setPending(true);
    await fetch('/api/me/onboarding/complete', { method: 'POST' });
    router.push('/home');
    router.refresh();
  }

  return (
    <Button variant={variant} disabled={pending || !hydrated} onClick={() => void finish()}>
      {label}
    </Button>
  );
}
