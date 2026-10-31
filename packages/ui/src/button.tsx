import type { ComponentProps } from 'react';

import { cn } from './cn.ts';

const variants = {
  primary: 'bg-emerald-500 text-zinc-950 hover:bg-emerald-400 focus-visible:outline-emerald-400',
  secondary:
    'border border-zinc-700 text-zinc-100 hover:border-zinc-500 hover:bg-zinc-900 focus-visible:outline-zinc-400',
} as const;

export type ButtonVariant = keyof typeof variants;

export const buttonBase =
  'inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50';

/** Class names for anything that should look like a button (links included). */
export function buttonClasses(variant: ButtonVariant = 'primary', className?: string): string {
  return cn(buttonBase, variants[variant], className);
}

export interface ButtonProps extends ComponentProps<'button'> {
  variant?: ButtonVariant;
}

export function Button({ variant = 'primary', className, type = 'button', ...props }: ButtonProps) {
  return <button type={type} className={buttonClasses(variant, className)} {...props} />;
}
