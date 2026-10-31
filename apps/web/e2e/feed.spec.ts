import { expect, test } from '@playwright/test';

import { newUser, signUpAndConfirm } from './accounts.ts';

test('the feed shows posts from people and tags you follow', async ({ browser, request }) => {
  const reader = newUser();
  const author = newUser();
  const readerPage = await browser.newPage();
  const authorPage = await browser.newPage();
  await signUpAndConfirm(readerPage, request, reader);
  await signUpAndConfirm(authorPage, request, author);
  const tag = `e2e_${Date.now().toString(36)}`;

  await expect(readerPage.getByText('Seu feed está vazio.')).toBeVisible();

  await authorPage.getByLabel('Conteúdo do post').fill('A post from someone I follow');
  await authorPage.getByRole('button', { name: 'Publicar' }).click();
  await expect(authorPage.locator('article')).toContainText('A post from someone I follow');
  await authorPage.getByLabel('Conteúdo do post').fill(`Only for the tag #${tag}`);
  await authorPage.getByRole('button', { name: 'Publicar' }).click();
  await expect(authorPage.locator('article').first()).toContainText('Only for the tag');

  // Following the person brings both posts in.
  await readerPage.goto(`/@${author.username}`);
  await readerPage.getByRole('button', { name: `Seguir @${author.username}` }).click();
  await expect(readerPage.getByText('1 seguidor', { exact: true })).toBeVisible();
  await readerPage.goto('/home');
  await expect(readerPage.locator('article')).toHaveCount(2);

  // After unfollowing, only the post with the followed tag stays.
  await readerPage.goto(`/tags/${tag}`);
  await readerPage.getByRole('button', { name: `Seguir #${tag}` }).click();
  await expect(readerPage.getByText('1 pessoa segue esta tag')).toBeVisible();
  await readerPage.goto(`/@${author.username}`);
  await readerPage.getByRole('button', { name: `Seguir @${author.username}` }).click();
  await expect(readerPage.getByText('0 seguidores')).toBeVisible();

  await readerPage.goto('/home');
  await expect(readerPage.locator('article')).toHaveCount(1);
  await expect(readerPage.locator('article')).toContainText('Only for the tag');

  await readerPage.close();
  await authorPage.close();
});
