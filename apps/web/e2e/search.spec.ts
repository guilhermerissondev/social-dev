import { expect, test } from '@playwright/test';

import { newUser, signUpAndConfirm } from './accounts.ts';

test('search finds people, tags and posts from the header', async ({ page, request }) => {
  const ada = newUser();
  await signUpAndConfirm(page, request, ada);
  const word = `zq${Date.now().toString(36)}`;

  await page.getByLabel('Conteúdo do post').fill(`Notas sobre programação em Rust #${word}`);
  await page.getByRole('button', { name: 'Publicar' }).click();
  await expect(page.getByLabel('Conteúdo do post')).toHaveValue('');

  // Without accents, from the header box.
  const box = page.getByRole('banner').getByRole('searchbox', { name: 'Buscar' });
  await box.fill(`programacao ${word}`);
  await box.press('Enter');
  await expect(
    page.getByRole('heading', { name: `Resultados para “programacao ${word}”` }),
  ).toBeVisible();
  await expect(page.locator('article')).toContainText('Notas sobre programação em Rust');

  // The tag shows up for its name.
  await page.goto(`/search?q=${word}`);
  await expect(
    page.getByRole('region', { name: 'Tags' }).getByRole('link', { name: new RegExp(`#${word}`) }),
  ).toBeVisible();

  // People, by @username.
  await page.goto(`/search?q=@${ada.username}&type=people`);
  await expect(page.getByRole('link', { name: 'Pessoas' })).toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('main').getByRole('listitem').first()).toContainText(
    `@${ada.username}`,
  );

  await page.goto('/search?q=nada_parecido_com_isso_xyz');
  await expect(page.getByText('Nada encontrado.')).toBeVisible();
});
