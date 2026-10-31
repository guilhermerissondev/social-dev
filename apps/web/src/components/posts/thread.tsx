import type { Post } from '@/lib/posts.ts';

import { PostCard } from './post-card.tsx';
import { ReplySection } from './reply-section.tsx';

/** Deeper replies keep their place in the tree but stop indenting, so text stays readable. */
const MAX_INDENT_DEPTH = 4;

/**
 * Groups a conversation's replies by the post they answer. Replies whose parent was
 * deleted hang from the conversation start.
 */
export function repliesByParent(rootId: string, replies: Post[]): Map<string, Post[]> {
  const children = new Map<string, Post[]>();
  for (const reply of replies) {
    const parentId = reply.replyTo?.id ?? rootId;
    children.set(parentId, [...(children.get(parentId) ?? []), reply]);
  }
  return children;
}

interface ThreadProps {
  parentId: string;
  /** From `repliesByParent`. */
  tree: Map<string, Post[]>;
  /** Null when the viewer can reply; otherwise where to send them. */
  fallbackHref: '/login' | '/welcome' | null;
  depth?: number;
}

/** Replies to `parentId` and, recursively, their replies. */
export function Thread({ parentId, tree, fallbackHref, depth = 0 }: ThreadProps) {
  const replies = tree.get(parentId) ?? [];
  if (replies.length === 0) return null;

  return (
    <ul
      className={
        depth > 0 && depth <= MAX_INDENT_DEPTH ? 'ml-4 border-l border-zinc-800 pl-4' : undefined
      }
    >
      {replies.map((reply) => (
        <li key={reply.id}>
          <PostCard post={reply} fallbackHref={fallbackHref} variant="reply" />
          {!fallbackHref && <ReplySection replyToId={reply.id} username={reply.author.username} />}
          <Thread parentId={reply.id} tree={tree} fallbackHref={fallbackHref} depth={depth + 1} />
        </li>
      ))}
    </ul>
  );
}
