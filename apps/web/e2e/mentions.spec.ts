import { expect, test } from '@playwright/test';

import { newUser, signUpAndConfirm } from './accounts.ts';

test('mention someone and they are notified', async ({ browser, request }) => {
  const ada = newUser();
  const grace = newUser();
  const adaPage = await browser.newPage();
  const gracePage = await browser.newPage();
  await signUpAndConfirm(adaPage, request, ada);
  await signUpAndConfirm(gracePage, request, grace);

  await adaPage.getByLabel('Conteúdo do post').fill(`Pairing with @${grace.username} today`);
  await adaPage.getByRole('button', { name: 'Publicar' }).click();
  const post = adaPage.locator('article').filter({ hasText: 'Pairing with' });

  // The mention links to the profile.
  await post.getByRole('link', { name: `@${grace.username}` }).click();
  await expect(adaPage).toHaveURL(new RegExp(`/@${grace.username}$`));

  await gracePage.reload();
  await expect(gracePage.getByRole('link', { name: 'Notificações (1 não lida)' })).toBeVisible();
  await gracePage.goto('/notifications');
  const item = gracePage.getByRole('main').getByRole('listitem').first();
  await expect(item).toContainText('mencionou você');
  await item.getByRole('link', { name: /Pairing with/ }).click();
  await expect(gracePage).toHaveURL(new RegExp(`/@${ada.username}/[0-9a-f-]{36}$`));

  await adaPage.close();
  await gracePage.close();
});
