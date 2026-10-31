import { expect, test } from '@playwright/test';

import { newUser, signUpAndConfirm } from './accounts.ts';
import { latestLinkSentTo } from './mailpit.ts';

test('edit the profile and see it on the public page', async ({ page, request, browser }) => {
  const user = newUser();
  await signUpAndConfirm(page, request, user);

  await page.getByRole('link', { name: `@${user.username}` }).click();
  await expect(page.getByRole('heading', { name: user.name })).toBeVisible();
  await page.getByRole('link', { name: 'Editar perfil' }).click();

  await page.getByLabel('Nome', { exact: true }).fill('Ada King');
  await page.getByLabel('Bio').fill('Notes on the Analytical Engine.');
  await page.getByLabel('Local').fill('Londres');
  await page.getByLabel('Tecnologias').fill('TypeScript, #rust, c++');
  await page.getByLabel('Nome do link 1').fill('Site');
  await page.getByLabel('Endereço do link 1').fill('https://ada.dev');
  await page.getByRole('button', { name: 'Salvar perfil' }).click();

  await expect(page.locator('form').getByRole('alert')).toContainText('c++');
  await page.getByLabel('Tecnologias').fill('TypeScript, #rust');
  await page.getByRole('button', { name: 'Salvar perfil' }).click();

  await expect(page).toHaveURL(new RegExp(`/@${user.username}$`));
  await expect(page.getByRole('heading', { name: 'Ada King' })).toBeVisible();

  // Anyone can see the profile, but only the owner gets the edit button.
  const visitor = await browser.newPage();
  await visitor.goto(`/@${user.username.toUpperCase()}`);
  await expect(visitor.getByRole('heading', { name: 'Ada King' })).toBeVisible();
  await expect(visitor.getByText('Notes on the Analytical Engine.')).toBeVisible();
  await expect(visitor.getByText('Londres')).toBeVisible();
  await expect(visitor.getByText('#typescript')).toBeVisible();
  await expect(visitor.getByText('#rust')).toBeVisible();
  await expect(visitor.getByRole('link', { name: 'ada.dev' })).toHaveAttribute(
    'href',
    'https://ada.dev',
  );
  await expect(visitor.getByRole('link', { name: 'Editar perfil' })).toHaveCount(0);
  await visitor.close();
});

test('unknown profiles return 404', async ({ page }) => {
  const res = await page.goto('/@nobody_with_this_name');
  expect(res?.status()).toBe(404);
});

test('accounts without a username choose one before using the site', async ({ page, request }) => {
  // GitHub and GitLab sign-ups arrive like this: signed in, but without a username.
  const user = newUser();
  const signUp = await request.post('/api/auth/sign-up/email', {
    headers: { origin: 'http://localhost:3000' },
    data: { name: user.name, email: user.email, password: user.password, callbackURL: '/home' },
  });
  expect(signUp.ok()).toBe(true);

  await page.goto(await latestLinkSentTo(request, user.email));
  await expect(page).toHaveURL(/\/welcome$/);

  await page.getByLabel('Nome de usuário').fill(user.username);
  await page.getByRole('button', { name: 'Continuar' }).click();

  await expect(page).toHaveURL(/\/home$/);
  await expect(page.getByRole('link', { name: `@${user.username}` })).toBeVisible();
});
