import { useFormatter, useTranslations } from 'next-intl';

import { Avatar } from '@/components/profile/avatar.tsx';
import { Link } from '@/i18n/navigation.ts';
import type { Post } from '@/lib/posts.ts';

import { PostActions } from './post-actions.tsx';
import { PostBody } from './post-body.tsx';

// Posts longer than this are cut in lists, with a link to the full post.
const COLLAPSE_AFTER_CHARACTERS = 1200;
const COLLAPSE_AFTER_LINES = 20;

function isLong(content: string) {
  return (
    content.length > COLLAPSE_AFTER_CHARACTERS || content.split('\n').length > COLLAPSE_AFTER_LINES
  );
}

export function postPath(post: Pick<Post, 'id' | 'author'>) {
  return `/@${post.author.username}/${post.id}` as const;
}

/**
 * A post with its author.
 * - `list`: in feeds and lists; long posts are collapsed.
 * - `page`: the post page; shown in full, the title is the page heading.
 * - `reply`: inside a conversation; compact, long replies are collapsed.
 */
export function PostCard({
  post,
  fallbackHref,
  repostedBy = null,
  variant = 'list',
}: {
  post: Post;
  /** Set when the post appears in a list because this person reposted it. */
  repostedBy?: { username: string; displayName: string } | null;
  /** Where Like and Save send viewers who cannot use them; see `actionFallbackHref`. */
  fallbackHref: '/login' | '/welcome' | null;
  variant?: 'list' | 'page' | 'reply';
}) {
  const t = useTranslations('Post');
  const format = useFormatter();
  const full = variant === 'page';
  const collapsed = !full && isLong(post.content);
  const TitleTag = full ? 'h1' : 'h2';
  const profilePath = `/@${post.author.username}` as const;

  return (
    <article className={variant === 'reply' ? 'py-3' : 'border-b border-zinc-800 py-6'}>
      {repostedBy && (
        <p className="mb-3 text-sm text-zinc-500">
          {t.rich('repostedBy', {
            name: repostedBy.displayName,
            link: (chunks) => (
              <Link href={`/@${repostedBy.username}`} className="text-zinc-300 hover:underline">
                {chunks}
              </Link>
            ),
          })}
        </p>
      )}
      {/* In a conversation the tree already shows what a reply answers. */}
      {post.replyTo && variant !== 'reply' && (
        <p className="mb-3 text-sm text-zinc-500">
          {t.rich('inReplyTo', {
            username: post.replyTo.authorUsername,
            link: (chunks) => (
              <Link
                href={`/@${post.replyTo?.authorUsername ?? ''}/${post.replyTo?.id ?? ''}`}
                className="text-emerald-400 hover:underline"
              >
                {chunks}
              </Link>
            ),
          })}
        </p>
      )}
      <header className="flex items-center gap-3">
        <Avatar name={post.author.displayName} url={post.author.avatarUrl} />
        <div className="min-w-0 text-sm">
          <Link href={profilePath} className="font-semibold text-zinc-100 hover:underline">
            {post.author.displayName}
          </Link>{' '}
          <span className="font-mono text-zinc-400">@{post.author.username}</span>
          <div className="text-zinc-500">
            <Link href={postPath(post)} className="hover:underline">
              <time dateTime={post.createdAt}>
                {format.dateTime(new Date(post.createdAt), {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </time>
            </Link>
            {post.editedAt && <span> · {t('edited')}</span>}
          </div>
        </div>
      </header>

      {post.title && (
        <TitleTag className="mt-4 text-xl font-bold tracking-tight text-zinc-100">
          {full ? post.title : <Link href={postPath(post)}>{post.title}</Link>}
        </TitleTag>
      )}

      <div className={collapsed ? 'relative max-h-96 overflow-hidden' : undefined}>
        <PostBody html={post.contentHtml} className="mt-3" />
        {collapsed && (
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-zinc-950" />
        )}
      </div>
      {collapsed && (
        <Link
          href={postPath(post)}
          className="mt-2 inline-block text-sm text-emerald-400 hover:underline"
        >
          {t('readMore')}
        </Link>
      )}
      <PostActions
        postId={post.id}
        postHref={postPath(post)}
        repliesCount={post.repliesCount}
        likesCount={post.likesCount}
        liked={post.likedByViewer}
        repostsCount={post.repostsCount}
        reposted={post.repostedByViewer}
        bookmarked={post.bookmarkedByViewer}
        fallbackHref={fallbackHref}
      />
    </article>
  );
}
