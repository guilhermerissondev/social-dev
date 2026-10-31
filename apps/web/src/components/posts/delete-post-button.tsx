'use client';

import { Button } from '@social-dev/ui';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { useRouter } from '@/i18n/navigation.ts';
import { useHydrated } from '@/lib/use-hydrated.ts';

export function DeletePostButton({
  postId,
  authorUsername,
}: {
  postId: string;
  authorUsername: string;
}) {
  const t = useTranslations('Post');
  const hydrated = useHydrated();
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onClick() {
    if (!window.confirm(t('confirmDelete'))) return;
    setPending(true);
    const res = await fetch(`/api/posts/${postId}`, { method: 'DELETE' });
    setPending(false);
    if (!res.ok) {
      window.alert(t('deleteFailed'));
      return;
    }
    router.push(`/@${authorUsername}`);
    router.refresh();
  }

  return (
    <Button variant="secondary" disabled={pending || !hydrated} onClick={() => void onClick()}>
      {t('delete')}
    </Button>
  );
}
