import type { Locator } from '@playwright/test';

/**
 * Clicks a control that updates the page before the server answers (like, save, repost,
 * follow) and waits for the API to confirm. Checks that depend on the stored state, such
 * as reloading or reading it from another account, must wait for that confirmation.
 */
export async function clickAndWaitForApi(control: Locator, path: RegExp): Promise<void> {
  const page = control.page();
  await Promise.all([
    page.waitForResponse((res) => path.test(new URL(res.url()).pathname) && res.ok()),
    control.click(),
  ]);
}
