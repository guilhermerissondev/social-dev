import { expect, test } from '@playwright/test';

import { newUser, signUpAndConfirm } from './accounts.ts';

test('like and save a post, then find it under Saved', async ({ page, request, browser }) => {
  const user = newUser();
  await signUpAndConfirm(page, request, user);
  await page.getByLabel('Conteúdo do post').fill('Worth keeping');
  await page.getByRole('button', { name: 'Publicar' }).click();

  const post = page.locator('article').filter({ hasText: 'Worth keeping' });
  const like = post.getByRole('button', { name: 'Curtir' });
  await like.click();
  await expect(like).toHaveAttribute('aria-pressed', 'true');
  await expect(like).toHaveText('1');

  await post.getByRole('button', { name: 'Salvar' }).click();
  await expect(post.getByRole('button', { name: 'Salvar' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );

  // Both survive a reload, since they come from the server.
  await page.reload();
  await expect(post.getByRole('button', { name: 'Curtir' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );

  await page.getByRole('link', { name: 'Salvos' }).click();
  await expect(page.getByRole('heading', { name: 'Salvos' })).toBeVisible();
  await expect(page.locator('article')).toContainText('Worth keeping');

  // Unsaving from the Saved page, then reloading, leaves it empty.
  await page.locator('article').getByRole('button', { name: 'Salvar' }).click();
  await expect(page.locator('article').getByRole('button', { name: 'Salvar' })).toHaveAttribute(
    'aria-pressed',
    'false',
  );
  await page.reload();
  await expect(page.getByText('Você ainda não salvou nenhum post.')).toBeVisible();

  // Visitors see the count, and the button takes them to log in.
  await page.goto('/home');
  await page.locator('article').filter({ hasText: 'Worth keeping' }).locator('time').click();
  await expect(page).toHaveURL(new RegExp(`/@${user.username}/[0-9a-f-]{36}$`));
  const postUrl = page.url();
  const visitor = await browser.newPage();
  await visitor.goto(postUrl);
  await expect(visitor.getByRole('link', { name: 'Curtir' })).toHaveText('1');
  await visitor.getByRole('link', { name: 'Curtir' }).click();
  await expect(visitor).toHaveURL(/\/login$/);
  await visitor.close();
});
