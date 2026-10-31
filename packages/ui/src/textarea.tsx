import type { ComponentProps } from 'react';

import { cn } from './cn.ts';

export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return (
    <textarea
      className={cn(
        'w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-emerald-400 focus:outline-none aria-invalid:border-red-500',
        className,
      )}
      {...props}
    />
  );
}
