'use client';

import { characterCount, POST_LIMITS } from '@social-dev/shared';
import { Alert, Button, cn, Field, Textarea } from '@social-dev/ui';
import { useFormatter, useTranslations } from 'next-intl';
import { useId, useState, type SubmitEvent } from 'react';

import { useRouter } from '@/i18n/navigation.ts';
import { apiErrorCode } from '@/lib/api-errors.ts';

import { PostBody } from './post-body.tsx';
import { useHydrated } from '@/lib/use-hydrated.ts';

interface ComposerProps {
  /** When set, the composer edits this post instead of creating a new one. */
  post?: {
    id: string;
    title: string | null;
    content: string;
    authorUsername: string;
    isReply: boolean;
  };
  /** When set, publishes a reply to this post. */
  replyToId?: string;
  /** Called after a new post or reply is published. */
  onPublished?: () => void;
}

type Mode = 'write' | 'preview';
type FormError = 'tooLong' | 'invalid' | 'unknown';

export function PostComposer({ post, replyToId, onPublished }: ComposerProps) {
  const t = useTranslations('Composer');
  const hydrated = useHydrated();
  const format = useFormatter();
  const router = useRouter();
  const contentId = useId();
  const [title, setTitle] = useState(post?.title ?? '');
  const [showTitle, setShowTitle] = useState(Boolean(post?.title));
  const [content, setContent] = useState(post?.content ?? '');
  const [mode, setMode] = useState<Mode>('write');
  // Replies have no title (they federate as plain notes).
  const canHaveTitle = !replyToId && !post?.isReply;
  const [previewHtml, setPreviewHtml] = useState('');
  const [error, setError] = useState<FormError | null>(null);
  const [pending, setPending] = useState(false);

  const count = characterCount(content);
  const overLimit = count > POST_LIMITS.content;

  async function showPreview() {
    setMode('preview');
    if (!content.trim()) {
      setPreviewHtml('');
      return;
    }
    const res = await fetch('/api/posts/preview', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ content }),
    });
    setPreviewHtml(res.ok ? ((await res.json()) as { html: string }).html : '');
  }

  async function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (overLimit) {
      setError('tooLong');
      return;
    }

    setPending(true);
    setError(null);
    const res = await fetch(post ? `/api/posts/${post.id}` : '/api/posts', {
      method: post ? 'PUT' : 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        title: canHaveTitle && showTitle ? title : null,
        content,
        ...(replyToId && { replyToId }),
      }),
    });
    setPending(false);

    if (!res.ok) {
      setError((await apiErrorCode(res)) === 'validation_error' ? 'invalid' : 'unknown');
      return;
    }
    if (post) {
      router.push(`/@${post.authorUsername}/${post.id}`);
    } else {
      // New posts appear at the top of the feed below the composer.
      setTitle('');
      setShowTitle(false);
      setContent('');
      setMode('write');
      onPublished?.();
    }
    router.refresh();
  }

  const tabClasses = (active: boolean) =>
    cn(
      'rounded-md px-3 py-1 text-sm',
      active ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400 hover:text-zinc-100',
    );

  return (
    <form onSubmit={(event) => void onSubmit(event)} className="flex flex-col gap-3">
      {error && (
        <Alert tone="error">
          {t(`errors.${error}`, { max: format.number(POST_LIMITS.content) })}
        </Alert>
      )}

      {canHaveTitle && showTitle && (
        <Field
          label={t('title')}
          name="title"
          value={title}
          onChange={(event) => {
            setTitle(event.target.value);
          }}
          maxLength={POST_LIMITS.title}
        />
      )}

      <div className="flex items-center justify-between">
        <div role="group" aria-label={t('mode')} className="flex gap-1">
          <button
            type="button"
            className={tabClasses(mode === 'write')}
            aria-pressed={mode === 'write'}
            onClick={() => {
              setMode('write');
            }}
          >
            {t('write')}
          </button>
          <button
            type="button"
            className={tabClasses(mode === 'preview')}
            aria-pressed={mode === 'preview'}
            onClick={() => void showPreview()}
          >
            {t('preview')}
          </button>
        </div>
        {canHaveTitle && !showTitle && (
          <button
            type="button"
            className="text-sm text-zinc-400 hover:text-zinc-100"
            onClick={() => {
              setShowTitle(true);
            }}
          >
            {t('addTitle')}
          </button>
        )}
      </div>

      {mode === 'write' ? (
        <>
          <label htmlFor={contentId} className="sr-only">
            {replyToId ? t('replyContent') : t('content')}
          </label>
          <Textarea
            id={contentId}
            name="content"
            value={content}
            onChange={(event) => {
              setContent(event.target.value);
            }}
            rows={post ? 16 : replyToId ? 3 : 5}
            // Controlled by React: text typed before hydration would be lost.
            disabled={!hydrated}
            required
            placeholder={replyToId ? t('replyPlaceholder') : t('placeholder')}
            className="font-mono"
          />
        </>
      ) : (
        <div aria-live="polite" className="min-h-32 rounded-md border border-zinc-800 px-3 py-2">
          <PostBody html={previewHtml || `<p>${t('nothingToPreview')}</p>`} />
        </div>
      )}

      <div className="flex items-center justify-between gap-4">
        <p className="text-xs text-zinc-500">{t('markdownHint')}</p>
        <div className="flex items-center gap-3">
          <span
            className={cn('text-xs tabular-nums', overLimit ? 'text-red-400' : 'text-zinc-500')}
          >
            {format.number(count)} / {format.number(POST_LIMITS.content)}
          </span>
          <Button type="submit" disabled={pending || !hydrated || !content.trim()}>
            {post ? t('save') : replyToId ? t('reply') : t('publish')}
          </Button>
        </div>
      </div>
    </form>
  );
}
