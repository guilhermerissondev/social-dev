import { expect, test } from '@playwright/test';

import { newUser, signUpAndConfirm } from './accounts.ts';
import { clickAndWaitForApi } from './actions.ts';

test('a repost reaches the followers of the person who reposted', async ({ browser, request }) => {
  const author = newUser();
  const booster = newUser();
  const reader = newUser();
  const [authorPage, boosterPage, readerPage] = await Promise.all([
    browser.newPage(),
    browser.newPage(),
    browser.newPage(),
  ]);
  await signUpAndConfirm(authorPage, request, author);
  await signUpAndConfirm(boosterPage, request, booster);
  await signUpAndConfirm(readerPage, request, reader);

  await authorPage.getByLabel('Conteúdo do post').fill('Signal worth boosting');
  await authorPage.getByRole('button', { name: 'Publicar' }).click();
  await expect(authorPage.locator('article')).toContainText('Signal worth boosting');

  // The reader follows only the booster.
  await readerPage.goto(`/@${booster.username}`);
  await readerPage.getByRole('button', { name: `Seguir @${booster.username}` }).click();
  await expect(readerPage.getByText('1 seguidor', { exact: true })).toBeVisible();

  await boosterPage.goto(`/@${author.username}`);
  const repost = boosterPage.locator('article').getByRole('button', { name: 'Repostar' });
  await clickAndWaitForApi(repost, /\/repost$/);
  await expect(repost).toHaveAttribute('aria-pressed', 'true');
  await expect(repost).toHaveText('1');

  // The reader sees it, credited to the booster.
  await readerPage.goto('/home');
  const entry = readerPage.locator('article').filter({ hasText: 'Signal worth boosting' });
  await expect(entry).toContainText(`${booster.name} repostou`);

  // The author is notified.
  await authorPage.goto('/notifications');
  await expect(authorPage.getByRole('main').getByRole('listitem').first()).toContainText(
    'repostou seu post',
  );

  // Undoing the repost takes it out of the reader's feed.
  await clickAndWaitForApi(repost, /\/repost$/);
  await expect(repost).toHaveAttribute('aria-pressed', 'false');
  await readerPage.reload();
  await expect(readerPage.getByText('Seu feed está vazio.')).toBeVisible();

  await Promise.all([authorPage.close(), boosterPage.close(), readerPage.close()]);
});
