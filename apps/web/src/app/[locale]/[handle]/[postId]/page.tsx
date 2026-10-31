import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { plainExcerpt } from '@social-dev/shared';
import { buttonClasses } from '@social-dev/ui';

import { DeletePostButton } from '@/components/posts/delete-post-button.tsx';
import { PostCard, postPath } from '@/components/posts/post-card.tsx';
import { Link } from '@/i18n/navigation.ts';
import { usernameFromSegment } from '@/lib/handles.ts';
import { getPost } from '@/lib/posts.ts';
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
  const [t, viewer, fallbackHref] = await Promise.all([
    getTranslations('Post'),
    getSessionUser(),
    actionFallbackHref(),
  ]);
  const isAuthor = viewer?.username === post.author.username.toLowerCase();

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <PostCard post={post} fallbackHref={fallbackHref} full />
      {isAuthor && (
        <div className="mt-4 flex gap-3">
          <Link href={`${postPath(post)}/edit`} className={buttonClasses('secondary')}>
            {t('edit')}
          </Link>
          <DeletePostButton postId={post.id} authorUsername={post.author.username} />
        </div>
      )}
    </div>
  );
}
