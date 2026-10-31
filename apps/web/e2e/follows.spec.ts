import { expect, test } from '@playwright/test';

import { newUser, signUpAndConfirm } from './accounts.ts';

test('follow and unfollow someone', async ({ browser, request }) => {
  const ada = newUser();
  const grace = newUser();
  const adaPage = await browser.newPage();
  const gracePage = await browser.newPage();
  await signUpAndConfirm(adaPage, request, ada);
  await signUpAndConfirm(gracePage, request, grace);

  await gracePage.goto(`/@${ada.username}`);
  await expect(gracePage.getByText('0 seguidores')).toBeVisible();
  await gracePage.getByRole('button', { name: `Seguir @${ada.username}` }).click();
  await expect(gracePage.getByRole('button', { name: `Seguir @${ada.username}` })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(gracePage.getByText('1 seguidor', { exact: true })).toBeVisible();

  // The follower shows up in the list, and the follow is mirrored on Grace's profile.
  await gracePage.getByRole('link', { name: '1 seguidor' }).click();
  await expect(
    gracePage.getByRole('heading', { name: `Seguidores de @${ada.username}` }),
  ).toBeVisible();
  await expect(
    gracePage.getByRole('listitem').getByRole('link', { name: new RegExp(`@${grace.username}`) }),
  ).toBeVisible();

  await adaPage.goto(`/@${grace.username}`);
  await expect(adaPage.getByText('1 seguindo')).toBeVisible();

  await gracePage.goto(`/@${ada.username}`);
  await gracePage.getByRole('button', { name: `Seguir @${ada.username}` }).click();
  await expect(gracePage.getByText('0 seguidores')).toBeVisible();

  await adaPage.close();
  await gracePage.close();
});

test('follow a tag', async ({ page, request }) => {
  await signUpAndConfirm(page, request, newUser());
  const tag = `e2e_${Date.now().toString(36)}`;

  await page.goto(`/tags/${tag}`);
  await expect(page.getByText('Ninguém segue esta tag ainda')).toBeVisible();
  await page.getByRole('button', { name: `Seguir #${tag}` }).click();
  await expect(page.getByText('1 pessoa segue esta tag')).toBeVisible();
});

test('visitors are asked to log in before following', async ({ page, request, browser }) => {
  const ada = newUser();
  await signUpAndConfirm(page, request, ada);

  const visitor = await browser.newPage();
  await visitor.goto(`/@${ada.username}`);
  await visitor.getByRole('link', { name: `Seguir @${ada.username}` }).click();
  await expect(visitor).toHaveURL(/\/login$/);
  await visitor.close();
});
