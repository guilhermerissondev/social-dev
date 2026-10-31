'use client';

import { cn } from '@social-dev/ui';
import { useFormatter, useTranslations } from 'next-intl';
import { useState, type ReactNode } from 'react';

import { Link } from '@/i18n/navigation.ts';

export interface PostActionsProps {
  postId: string;
  /** The post page, where the conversation is. */
  postHref: `/@${string}/${string}`;
  repliesCount: number;
  likesCount: number;
  liked: boolean;
  repostsCount: number;
  reposted: boolean;
  bookmarked: boolean;
  /** Set when the viewer cannot act yet; the buttons become links there. */
  fallbackHref: '/login' | '/welcome' | null;
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className="size-5"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="2"
    >
      <path
        d="M12 20s-7-4.35-7-10a4 4 0 0 1 7-2.65A4 4 0 0 1 19 10c0 5.65-7 10-7 10Z"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CommentIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className="size-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M4 5h16v11H9l-5 4V5Z" strokeLinejoin="round" />
    </svg>
  );
}

function RepostIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className="size-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 10V8a3 3 0 0 1 3-3h12m0 0-3-3m3 3-3 3M20 14v2a3 3 0 0 1-3 3H5m0 0 3 3m-3-3 3-3" />
    </svg>
  );
}

function BookmarkIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className="size-5"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M6 4h12v16l-6-4-6 4V4Z" strokeLinejoin="round" />
    </svg>
  );
}

const actionClasses =
  'inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-zinc-400 transition-colors hover:bg-zinc-900 hover:text-zinc-100 disabled:opacity-50';

/** A toggle that flips right away and rolls back if the request fails. */
function useToggle(initial: boolean, apiPath: string) {
  const [on, setOn] = useState(initial);
  const [pending, setPending] = useState(false);

  async function toggle(): Promise<boolean> {
    const next = !on;
    setOn(next);
    setPending(true);
    const res = await fetch(apiPath, { method: next ? 'POST' : 'DELETE' });
    setPending(false);
    if (!res.ok) setOn(!next);
    return res.ok;
  }

  return { on, pending, toggle };
}

export function PostActions({
  postId,
  postHref,
  repliesCount,
  likesCount,
  liked,
  repostsCount,
  reposted,
  bookmarked,
  fallbackHref,
}: PostActionsProps) {
  const t = useTranslations('PostActions');
  const format = useFormatter();
  const like = useToggle(liked, `/api/posts/${postId}/like`);
  const repost = useToggle(reposted, `/api/posts/${postId}/repost`);
  const bookmark = useToggle(bookmarked, `/api/posts/${postId}/bookmark`);
  // Counts shown = server count, adjusted when the viewer's choice changes on this page.
  const adjusted = (count: number, initial: boolean, on: boolean) =>
    count + (on === initial ? 0 : on ? 1 : -1);

  function action(
    label: string,
    pressed: boolean,
    content: ReactNode,
    onClick: () => void,
    pending: boolean,
    activeClass: string,
  ) {
    if (fallbackHref) {
      return (
        <Link href={fallbackHref} aria-label={label} className={actionClasses}>
          {content}
        </Link>
      );
    }
    return (
      <button
        type="button"
        aria-label={label}
        aria-pressed={pressed}
        disabled={pending}
        onClick={onClick}
        className={cn(actionClasses, pressed && activeClass)}
      >
        {content}
      </button>
    );
  }

  return (
    <div className="mt-3 flex gap-2">
      <Link href={postHref} aria-label={t('comments')} className={actionClasses}>
        <CommentIcon />
        <span className="tabular-nums">{format.number(repliesCount)}</span>
      </Link>
      {action(
        t('repost'),
        repost.on,
        <>
          <RepostIcon />
          <span className="tabular-nums">
            {format.number(adjusted(repostsCount, reposted, repost.on))}
          </span>
        </>,
        () => void repost.toggle(),
        repost.pending,
        'text-sky-400 hover:text-sky-300',
      )}
      {action(
        t('like'),
        like.on,
        <>
          <HeartIcon filled={like.on} />
          <span className="tabular-nums">
            {format.number(adjusted(likesCount, liked, like.on))}
          </span>
        </>,
        () => void like.toggle(),
        like.pending,
        'text-rose-400 hover:text-rose-300',
      )}
      {action(
        t('bookmark'),
        bookmark.on,
        <BookmarkIcon filled={bookmark.on} />,
        () => void bookmark.toggle(),
        bookmark.pending,
        'text-emerald-400 hover:text-emerald-300',
      )}
    </div>
  );
}
