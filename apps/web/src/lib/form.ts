/** Reads a text field from form data, returning an empty string for missing or file values. */
export function formText(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === 'string' ? value : '';
}
