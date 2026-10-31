import { expect, type APIRequestContext, type Page } from '@playwright/test';

import { latestLinkSentTo } from './mailpit.ts';

export function newUser() {
  const id = `${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`;
  return {
    name: 'Ada Lovelace',
    username: `ada_${id}`,
    email: `ada_${id}@example.com`,
    password: 'correct horse battery staple',
  };
}

export type User = ReturnType<typeof newUser>;

export async function signUp(page: Page, user: User) {
  await page.goto('/signup');
  await page.getByLabel('Nome', { exact: true }).fill(user.name);
  await page.getByLabel('Nome de usuário').fill(user.username);
  await page.getByLabel('E-mail').fill(user.email);
  await page.getByLabel('Senha', { exact: true }).fill(user.password);
  await page.getByRole('button', { name: 'Criar conta' }).click();
  await expect(page.getByRole('heading', { name: 'Confira seu e-mail' })).toBeVisible();
}

/**
 * Signs up through the form, follows the confirmation link and skips onboarding through the
 * API (onboarding.spec.ts covers it), ending signed in on /home.
 */
export async function signUpAndConfirm(page: Page, request: APIRequestContext, user: User) {
  await signUp(page, user);
  await page.goto(await latestLinkSentTo(request, user.email));
  await expect(page).toHaveURL(/\/onboarding$/);
  // page.request shares the page's cookies, so this acts as the new account.
  const res = await page.request.post('/api/me/onboarding/complete', {
    headers: { origin: 'http://localhost:3000' },
  });
  expect(res.ok()).toBe(true);
  await page.goto('/home');
  await expect(page).toHaveURL(/\/home$/);
}
