import { useFormatter, useTranslations } from 'next-intl';

import { Avatar } from '@/components/profile/avatar.tsx';
import { Link } from '@/i18n/navigation.ts';
import type { Post } from '@/lib/posts.ts';

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
 * A post with its author. In lists (`full` false) long posts are collapsed; on the post
 * page they show in full and the title is the page heading.
 */
export function PostCard({ post, full = false }: { post: Post; full?: boolean }) {
  const t = useTranslations('Post');
  const format = useFormatter();
  const collapsed = !full && isLong(post.content);
  const TitleTag = full ? 'h1' : 'h2';
  const profilePath = `/@${post.author.username}` as const;

  return (
    <article className="border-b border-zinc-800 py-6">
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
    </article>
  );
}
