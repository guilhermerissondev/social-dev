import { useId, type ComponentProps, type ReactNode } from 'react';

import { Input } from './input.tsx';
import { Textarea } from './textarea.tsx';

interface FieldShellProps {
  label: string;
  hint?: string | undefined;
  id?: string | undefined;
  children: (props: { id: string; 'aria-describedby': string | undefined }) => ReactNode;
}

function FieldShell({ label, hint, id, children }: FieldShellProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const hintId = `${inputId}-hint`;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-sm font-medium text-zinc-300">
        {label}
      </label>
      {children({ id: inputId, 'aria-describedby': hint ? hintId : undefined })}
      {hint && (
        <p id={hintId} className="text-xs text-zinc-500">
          {hint}
        </p>
      )}
    </div>
  );
}

export interface FieldProps extends ComponentProps<'input'> {
  label: string;
  hint?: string | undefined;
}

/** A labelled input with an optional hint below it. */
export function Field({ label, hint, id, ...props }: FieldProps) {
  return (
    <FieldShell label={label} hint={hint} id={id}>
      {(control) => <Input {...control} {...props} />}
    </FieldShell>
  );
}

export interface TextareaFieldProps extends ComponentProps<'textarea'> {
  label: string;
  hint?: string | undefined;
}

/** A labelled multi-line input with an optional hint below it. */
export function TextareaField({ label, hint, id, ...props }: TextareaFieldProps) {
  return (
    <FieldShell label={label} hint={hint} id={id}>
      {(control) => <Textarea {...control} {...props} />}
    </FieldShell>
  );
}
