'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { useHydrated } from '@/lib/use-hydrated.ts';

import { PostComposer } from './post-composer.tsx';

/** "Reply" under a reply in a conversation, opening a composer in place. */
export function ReplySection({ replyToId, username }: { replyToId: string; username: string }) {
  const t = useTranslations('Thread');
  const hydrated = useHydrated();
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        className="text-xs text-zinc-400 hover:text-zinc-100 disabled:opacity-50"
        disabled={!hydrated}
        aria-label={t('replyTo', { username })}
        onClick={() => {
          setOpen(true);
        }}
      >
        {t('reply')}
      </button>
    );
  }

  return (
    <div className="mt-2">
      <PostComposer
        replyToId={replyToId}
        onPublished={() => {
          setOpen(false);
        }}
      />
    </div>
  );
}
