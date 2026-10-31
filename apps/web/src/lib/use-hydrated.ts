import { useSyncExternalStore } from 'react';

const subscribe = () => () => undefined;

/**
 * False while the page is server-rendered and until React has hydrated it, true after.
 * Interactive controls stay disabled until then: a click before hydration is otherwise
 * lost, and a form submitted before it would fall back to a native GET, putting fields
 * such as passwords in the URL.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
