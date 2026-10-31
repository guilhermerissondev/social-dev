import type { ReactNode } from 'react';

import { cn } from './cn.ts';

const tones = {
  error: 'border-red-900 bg-red-950/50 text-red-200',
  success: 'border-emerald-900 bg-emerald-950/50 text-emerald-200',
  info: 'border-zinc-700 bg-zinc-900 text-zinc-300',
} as const;

export interface AlertProps {
  tone?: keyof typeof tones;
  children: ReactNode;
}

export function Alert({ tone = 'info', children }: AlertProps) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn('rounded-md border px-3 py-2 text-sm', tones[tone])}
    >
      {children}
    </div>
  );
}
