import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { plainExcerpt } from '@social-dev/shared';
import { buttonClasses } from '@social-dev/ui';

import { DeletePostButton } from '@/components/posts/delete-post-button.tsx';
import { PostCard, postPath } from '@/components/posts/post-card.tsx';
import { PostComposer } from '@/components/posts/post-composer.tsx';
import { repliesByParent, Thread } from '@/components/posts/thread.tsx';
import { Link } from '@/i18n/navigation.ts';
import { usernameFromSegment } from '@/lib/handles.ts';
import { getPost, getThread } from '@/lib/posts.ts';
import { getSessionUser } from '@/lib/session.ts';
import { actionFallbackHref } from '@/lib/viewer.ts';

type Params = PageProps<'/[locale]/[handle]/[postId]'>['params'];

/** Loads the post at /@username/id. The username must be the author's. */
async function postFromParams(params: Params) {
  const { handle, postId } = await params;
  const username = usernameFromSegment(handle);
  const post = await getPost(postId);
  if (post?.author.username.toLowerCase() !== username.toLowerCase()) notFound();
  return post;
}

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/[handle]/[postId]'>): Promise<Metadata> {
  const post = await postFromParams(params);
  const author = `${post.author.displayName} (@${post.author.username})`;
  return {
    title: `${post.title ?? author} · Social Dev`,
    description: plainExcerpt(post.content),
  };
}

export default async function PostPage({ params }: PageProps<'/[locale]/[handle]/[postId]'>) {
  const post = await postFromParams(params);
  const [t, viewer, fallbackHref, replies] = await Promise.all([
    getTranslations('Post'),
    getSessionUser(),
    actionFallbackHref(),
    // A reply's page shows the part of the conversation below it.
    getThread(post.threadId ?? post.id),
  ]);
  const isAuthor = viewer?.username === post.author.username.toLowerCase();
  const tree = repliesByParent(post.threadId ?? post.id, replies);

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <PostCard post={post} fallbackHref={fallbackHref} variant="page" />
      {isAuthor && (
        <div className="mt-4 flex gap-3">
          <Link href={`${postPath(post)}/edit`} className={buttonClasses('secondary')}>
            {t('edit')}
          </Link>
          <DeletePostButton postId={post.id} authorUsername={post.author.username} />
        </div>
      )}

      <section className="mt-8" aria-labelledby="comments-heading">
        <h2 id="comments-heading" className="text-sm font-semibold text-zinc-300">
          {t('comments', { count: post.repliesCount })}
        </h2>
        <div className="mt-4">
          {fallbackHref ? (
            <Link href={fallbackHref} className="text-sm text-emerald-400 hover:underline">
              {t('loginToComment')}
            </Link>
          ) : (
            <PostComposer replyToId={post.id} />
          )}
        </div>
        <div className="mt-4">
          <Thread parentId={post.id} tree={tree} fallbackHref={fallbackHref} />
        </div>
      </section>
    </div>
  );
}
