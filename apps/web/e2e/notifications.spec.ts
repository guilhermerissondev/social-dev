import { expect, test } from '@playwright/test';

import { newUser, signUpAndConfirm } from './accounts.ts';

test('get notified about new followers and likes', async ({ browser, request }) => {
  const ada = newUser();
  const grace = newUser();
  const adaPage = await browser.newPage();
  const gracePage = await browser.newPage();
  await signUpAndConfirm(adaPage, request, ada);
  await signUpAndConfirm(gracePage, request, grace);

  await adaPage.getByLabel('Conteúdo do post').fill('Notes on the engine');
  await adaPage.getByRole('button', { name: 'Publicar' }).click();
  await expect(adaPage.locator('article')).toContainText('Notes on the engine');

  // Grace follows Ada and likes her post.
  await gracePage.goto(`/@${ada.username}`);
  await gracePage.getByRole('button', { name: `Seguir @${ada.username}` }).click();
  const like = gracePage.locator('article').getByRole('button', { name: 'Curtir' });
  await like.click();
  await expect(like).toHaveAttribute('aria-pressed', 'true');

  // Ada sees the unread count, then both notifications.
  await adaPage.reload();
  await expect(adaPage.getByRole('link', { name: 'Notificações (2 não lidas)' })).toBeVisible();
  await adaPage.getByRole('link', { name: /Notificações/ }).click();

  const items = adaPage.getByRole('main').getByRole('listitem');
  await expect(items).toHaveCount(2);
  await expect(items.first()).toContainText('curtiu seu post');
  await expect(items.first()).toContainText('Notes on the engine');
  await expect(items.last()).toContainText('começou a seguir você');

  // Opening the page marks them as read.
  await expect(adaPage.getByRole('link', { name: 'Notificações', exact: true })).toBeVisible();
  await adaPage.reload();
  await expect(items.first()).not.toContainText('não lida');

  await adaPage.close();
  await gracePage.close();
});
