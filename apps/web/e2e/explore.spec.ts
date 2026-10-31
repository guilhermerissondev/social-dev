import { expect, test } from '@playwright/test';

import { newUser, signUpAndConfirm } from './accounts.ts';
import { clickAndWaitForApi } from './actions.ts';

test('explore shows popular posts to everyone and filters by tag', async ({
  page,
  request,
  browser,
}) => {
  await signUpAndConfirm(page, request, newUser());
  const tag = `e2e_${Date.now().toString(36)}`;

  for (const content of [`Quiet post #${tag}`, `Popular post #${tag}`]) {
    await page.getByLabel('Conteúdo do post').fill(content);
    await page.getByRole('button', { name: 'Publicar' }).click();
    await expect(page.getByLabel('Conteúdo do post')).toHaveValue('');
  }
  const popular = page.locator('article').filter({ hasText: 'Popular post' });
  await clickAndWaitForApi(popular.getByRole('button', { name: 'Curtir' }), /\/like$/);
  await expect(popular.getByRole('button', { name: 'Curtir' })).toHaveText('1');

  // A visitor reaches Explore from the header.
  const visitor = await browser.newPage();
  await visitor.goto('/');
  await visitor.getByRole('link', { name: 'Explorar' }).click();
  await expect(visitor.getByRole('heading', { name: 'Explorar', level: 1 })).toBeVisible();
  await expect(visitor.getByRole('link', { name: 'Esta semana' })).toHaveAttribute(
    'aria-current',
    'page',
  );

  // Filtering by the tag shows the liked post first.
  await visitor.goto(`/explore?tag=${tag}`);
  await expect(visitor.getByText(`Filtrando por #${tag}`)).toBeVisible();
  const articles = visitor.locator('article');
  await expect(articles).toHaveCount(2);
  await expect(articles.first()).toContainText('Popular post');

  await visitor.getByRole('link', { name: 'Hoje' }).click();
  await expect(visitor).toHaveURL(new RegExp(`period=day&tag=${tag}`));
  await expect(articles).toHaveCount(2);
  await visitor.close();
});
