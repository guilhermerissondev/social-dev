import { expect, test, type Page } from '@playwright/test';

import { latestLinkSentTo } from './mailpit.ts';

function newUser() {
  const id = `${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`;
  return {
    name: 'Ada Lovelace',
    username: `ada_${id}`,
    email: `ada_${id}@example.com`,
    password: 'correct horse battery staple',
  };
}

type User = ReturnType<typeof newUser>;

async function signUp(page: Page, user: User) {
  await page.goto('/signup');
  await page.getByLabel('Nome', { exact: true }).fill(user.name);
  await page.getByLabel('Nome de usuário').fill(user.username);
  await page.getByLabel('E-mail').fill(user.email);
  await page.getByLabel('Senha', { exact: true }).fill(user.password);
  await page.getByRole('button', { name: 'Criar conta' }).click();
  await expect(page.getByRole('heading', { name: 'Confira seu e-mail' })).toBeVisible();
}

async function logIn(page: Page, identifier: string, password: string) {
  await page.goto('/login');
  await page.getByLabel('E-mail ou nome de usuário').fill(identifier);
  await page.getByLabel('Senha', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
}

test('sign up, confirm the email, log out and log in again', async ({ page, request }) => {
  const user = newUser();
  await signUp(page, user);

  await page.goto(await latestLinkSentTo(request, user.email));
  await expect(page).toHaveURL(/\/home$/);
  await expect(page.getByRole('heading', { name: `Olá, ${user.name}!` })).toBeVisible();
  await expect(page.getByRole('link', { name: `@${user.username}` })).toBeVisible();

  await page.getByRole('button', { name: 'Sair' }).click();
  await expect(page.getByRole('link', { name: 'Entrar' })).toBeVisible();

  await logIn(page, user.username, user.password);
  await expect(page.getByRole('heading', { name: `Olá, ${user.name}!` })).toBeVisible();
});

test('rejects a wrong password', async ({ page }) => {
  await logIn(page, 'someone@example.com', 'wrong password');
  // Scoped to the form: Next.js also renders a route announcer with role="alert".
  await expect(page.locator('form').getByRole('alert')).toHaveText('E-mail ou senha incorretos.');
});

test('asks to confirm the email before logging in', async ({ page }) => {
  const user = newUser();
  await signUp(page, user);

  await logIn(page, user.email, user.password);
  await expect(page.locator('form').getByRole('status')).toContainText(
    'Seu e-mail ainda não foi confirmado',
  );
});

test('resets a forgotten password', async ({ page, request }) => {
  const user = newUser();
  await signUp(page, user);
  await page.goto(await latestLinkSentTo(request, user.email));
  await page.getByRole('button', { name: 'Sair' }).click();
  await expect(page.getByRole('link', { name: 'Entrar' })).toBeVisible();

  await page.goto('/forgot-password');
  await page.getByLabel('E-mail').fill(user.email);
  await page.getByRole('button', { name: 'Enviar link' }).click();
  await expect(page.getByRole('status')).toContainText('Se existir uma conta');

  await expect
    .poll(async () => (await latestLinkSentTo(request, user.email)).includes('reset-password'))
    .toBe(true);
  await page.goto(await latestLinkSentTo(request, user.email));
  await page.getByLabel('Nova senha').fill('a brand new password');
  await page.getByRole('button', { name: 'Salvar nova senha' }).click();
  await expect(page.getByRole('status')).toContainText('Senha alterada');

  await logIn(page, user.email, 'a brand new password');
  await expect(page.getByRole('heading', { name: `Olá, ${user.name}!` })).toBeVisible();
});

test('redirects anonymous visitors from the feed to the login page', async ({ page }) => {
  await page.goto('/home');
  await expect(page).toHaveURL(/\/login$/);
});

test('serves English under /en', async ({ page }) => {
  await page.goto('/en');
  await expect(
    page.getByRole('heading', { name: 'The social network for people who build software.' }),
  ).toBeVisible();
});
