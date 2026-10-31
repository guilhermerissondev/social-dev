import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { PostComposer } from '@/components/posts/post-composer.tsx';
import { requireUserWithUsername } from '@/lib/guards.ts';
import { getPost } from '@/lib/posts.ts';

export default async function EditPostPage({
  params,
}: PageProps<'/[locale]/[handle]/[postId]/edit'>) {
  const user = await requireUserWithUsername();
  const post = await getPost((await params).postId);
  // Only the author can edit; to anyone else the page does not exist.
  if (post?.author.username.toLowerCase() !== user.username) notFound();

  const t = await getTranslations('Composer');

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="mb-6 text-2xl font-bold tracking-tight">{t('editTitle')}</h1>
      <PostComposer post={{ id: post.id, title: post.title, content: post.content }} />
    </div>
  );
}
