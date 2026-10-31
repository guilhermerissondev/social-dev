import { useId, type ComponentProps } from 'react';

import { Input } from './input.tsx';

export interface FieldProps extends ComponentProps<'input'> {
  label: string;
  hint?: string | undefined;
}

/** A labelled input with an optional hint below it. */
export function Field({ label, hint, id, ...props }: FieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const hintId = `${inputId}-hint`;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-sm font-medium text-zinc-300">
        {label}
      </label>
      <Input id={inputId} aria-describedby={hint ? hintId : undefined} {...props} />
      {hint && (
        <p id={hintId} className="text-xs text-zinc-500">
          {hint}
        </p>
      )}
    </div>
  );
}
