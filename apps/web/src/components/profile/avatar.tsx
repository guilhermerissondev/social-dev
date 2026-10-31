import { cn } from '@social-dev/ui';

const sizes = { md: 'size-12 text-lg', lg: 'size-24 text-3xl' } as const;

/** Profile picture, or the first letter of the name when there is none. */
export function Avatar({
  name,
  url,
  size = 'md',
}: {
  name: string;
  url: string | null;
  size?: keyof typeof sizes;
}) {
  const classes = cn('shrink-0 rounded-full', sizes[size]);

  if (url) {
    // Avatars come from GitHub/GitLab for now; next/image would need every host allow-listed.
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" className={cn(classes, 'object-cover')} />;
  }
  return (
    <span
      aria-hidden
      className={cn(classes, 'flex items-center justify-center bg-zinc-800 font-semibold')}
    >
      {name.trim().charAt(0).toUpperCase() || '?'}
    </span>
  );
}
