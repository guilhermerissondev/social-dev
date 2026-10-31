import { expect, test } from '@playwright/test';

import { newUser, signUpAndConfirm } from './accounts.ts';

test('comment on a post and reply to a comment', async ({ browser, request }) => {
  const ada = newUser();
  const grace = newUser();
  const adaPage = await browser.newPage();
  const gracePage = await browser.newPage();
  await signUpAndConfirm(adaPage, request, ada);
  await signUpAndConfirm(gracePage, request, grace);

  await adaPage.getByLabel('Conteúdo do post').fill('Tabs or spaces?');
  await adaPage.getByRole('button', { name: 'Publicar' }).click();
  await adaPage.locator('article').filter({ hasText: 'Tabs or spaces?' }).locator('time').click();
  await expect(adaPage).toHaveURL(new RegExp(`/@${ada.username}/[0-9a-f-]{36}$`));
  const postUrl = adaPage.url();

  // Grace comments.
  await gracePage.goto(postUrl);
  await gracePage.getByLabel('Conteúdo da resposta').fill('Spaces, obviously');
  await gracePage.getByRole('button', { name: 'Responder', exact: true }).click();
  await expect(gracePage.getByRole('heading', { name: '1 comentário' })).toBeVisible();
  await expect(
    gracePage.getByRole('listitem').filter({ hasText: 'Spaces, obviously' }),
  ).toBeVisible();

  // Ada is notified and replies to the comment in place.
  await adaPage.goto('/notifications');
  await expect(adaPage.getByRole('main').getByRole('listitem').first()).toContainText(
    'respondeu seu post',
  );
  await adaPage.goto(postUrl);
  await adaPage.getByRole('button', { name: `Responder a @${grace.username}` }).click();
  const comment = adaPage.getByRole('listitem').filter({ hasText: 'Spaces, obviously' });
  await comment.getByLabel('Conteúdo da resposta').fill('Tabs, and I will die on this hill');
  await comment.getByRole('button', { name: 'Responder', exact: true }).click();

  // The reply is nested under the comment.
  await expect(adaPage.getByRole('heading', { name: '2 comentários' })).toBeVisible();
  await expect(comment.getByRole('list')).toContainText('Tabs, and I will die on this hill');

  // Comments stay out of the feed; the post shows the count.
  await adaPage.goto('/home');
  await expect(adaPage.locator('article')).toHaveCount(1);
  await expect(adaPage.locator('article').getByRole('link', { name: 'Comentários' })).toHaveText(
    '2',
  );

  await adaPage.close();
  await gracePage.close();
});

test('visitors can read comments but are asked to log in to comment', async ({
  page,
  request,
  browser,
}) => {
  const ada = newUser();
  await signUpAndConfirm(page, request, ada);
  await page.getByLabel('Conteúdo do post').fill('Open discussion');
  await page.getByRole('button', { name: 'Publicar' }).click();
  await page.locator('article').locator('time').click();
  await expect(page).toHaveURL(new RegExp(`/@${ada.username}/[0-9a-f-]{36}$`));
  await page.getByLabel('Conteúdo da resposta').fill('First!');
  await page.getByRole('button', { name: 'Responder', exact: true }).click();
  await expect(page.getByRole('heading', { name: '1 comentário' })).toBeVisible();

  const visitor = await browser.newPage();
  await visitor.goto(page.url());
  await expect(visitor.getByText('First!')).toBeVisible();
  await visitor.getByRole('link', { name: 'Entre para comentar' }).click();
  await expect(visitor).toHaveURL(/\/login$/);
  await visitor.close();
});
