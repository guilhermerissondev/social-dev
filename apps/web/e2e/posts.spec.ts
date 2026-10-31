import { expect, test } from '@playwright/test';

import { newUser, signUpAndConfirm } from './accounts.ts';

test('publish, read, edit and delete a post', async ({ page, request }) => {
  const user = newUser();
  await signUpAndConfirm(page, request, user);
  const tag = `e2e_${Date.now().toString(36)}`;

  await page.getByRole('button', { name: 'Adicionar título' }).click();
  await page.getByLabel('Título').fill('Hello, Social Dev');
  await page
    .getByLabel('Conteúdo do post')
    .fill(`Trying **Markdown** with #${tag}\n\n\`\`\`ts\nconst answer = 42;\n\`\`\``);

  await page.getByRole('button', { name: 'Pré-visualizar' }).click();
  await expect(page.locator('form strong')).toHaveText('Markdown');
  await page.getByRole('button', { name: 'Escrever' }).click();
  await page.getByRole('button', { name: 'Publicar' }).click();

  // It shows up at the top of the feed, and the composer is cleared.
  await expect(page.getByLabel('Conteúdo do post')).toHaveValue('');
  await page.getByRole('link', { name: 'Hello, Social Dev' }).click();

  // The post page.
  await expect(page).toHaveURL(new RegExp(`/@${user.username}/[0-9a-f-]{36}$`));
  await expect(page.getByRole('heading', { name: 'Hello, Social Dev' })).toBeVisible();
  await expect(page.locator('article .hljs-keyword')).toHaveText('const');
  const postUrl = page.url();

  // The hashtag leads to the tag page, which lists the post.
  await page.getByRole('link', { name: `#${tag}` }).click();
  await expect(page.getByRole('heading', { name: `#${tag}` })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Hello, Social Dev' })).toBeVisible();

  // The profile lists it too.
  await page.goto(`/@${user.username}`);
  await expect(page.getByRole('link', { name: 'Hello, Social Dev' })).toBeVisible();

  // Edit.
  await page.goto(postUrl);
  await page.getByRole('link', { name: 'Editar', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Editar post' })).toBeVisible();
  await page.getByLabel('Conteúdo do post').fill('Edited content');
  await page.getByRole('button', { name: 'Salvar' }).click();
  await expect(page).toHaveURL(postUrl);
  await expect(page.getByText('Edited content')).toBeVisible();
  await expect(page.getByText('editado')).toBeVisible();

  // Delete.
  page.once('dialog', (dialog) => void dialog.accept());
  await page.getByRole('button', { name: 'Excluir' }).click();
  await expect(page).toHaveURL(new RegExp(`/@${user.username}$`));
  await expect(page.getByText('Nenhum post ainda.')).toBeVisible();
  expect((await page.goto(postUrl))?.status()).toBe(404);
});

test('other people see the post without edit controls', async ({ page, request, browser }) => {
  const user = newUser();
  await signUpAndConfirm(page, request, user);
  await page.getByLabel('Conteúdo do post').fill('A public post');
  await page.getByRole('button', { name: 'Publicar' }).click();
  // The timestamp links to the post page.
  await page.locator('article').filter({ hasText: 'A public post' }).locator('time').click();
  await expect(page).toHaveURL(new RegExp(`/@${user.username}/[0-9a-f-]{36}$`));

  const visitor = await browser.newPage();
  await visitor.goto(page.url());
  await expect(visitor.getByText('A public post')).toBeVisible();
  await expect(visitor.getByRole('button', { name: 'Excluir' })).toHaveCount(0);
  // Signed-out visitors are sent to log in before they can reach the edit page.
  await visitor.goto(`${page.url()}/edit`);
  await expect(visitor).toHaveURL(/\/login$/);
  await visitor.close();
});
