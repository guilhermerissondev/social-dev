import { cn } from '@social-dev/ui';

/**
 * Post HTML rendered by the API. Only pass HTML from the API: it is sanitized there when
 * the post is saved or previewed (packages/markdown).
 */
export function PostBody({ html, className }: { html: string; className?: string }) {
  return (
    <div
      className={cn(
        'post-body prose prose-invert max-w-none prose-a:text-emerald-400 prose-pre:border prose-pre:border-zinc-800 prose-pre:bg-zinc-900',
        className,
      )}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
