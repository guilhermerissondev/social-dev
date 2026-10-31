import { expect, test } from '@playwright/test';

import { newUser, signUpAndConfirm } from './accounts.ts';

test('find people in the directory by stack, area and location', async ({
  page,
  request,
  browser,
}) => {
  const ada = newUser();
  await signUpAndConfirm(page, request, ada);
  const tech = `e2e_${Date.now().toString(36)}`;

  await page.goto('/settings/profile');
  await page.getByLabel('Local').fill('São Paulo, SP');
  await page.getByLabel('Área').selectOption({ label: 'Back-end' });
  await page.getByLabel('Senioridade').selectOption({ label: 'Sênior' });
  await page.getByLabel('Tecnologias').fill(`${tech}, postgresql`);
  await page.getByRole('button', { name: 'Salvar perfil' }).click();
  await expect(page).toHaveURL(new RegExp(`/@${ada.username}$`));
  await expect(page.getByRole('link', { name: 'Back-end' })).toBeVisible();

  // A visitor filters the directory; the location matches without the accent.
  const visitor = await browser.newPage();
  await visitor.goto('/directory');
  await visitor.getByLabel('Tecnologia').fill(tech);
  await visitor.getByLabel('Área').selectOption({ label: 'Back-end' });
  await visitor.getByLabel('Local').fill('sao paulo');
  await visitor.getByRole('button', { name: 'Filtrar' }).click();

  const results = visitor
    .getByRole('main')
    .getByRole('listitem')
    .filter({ hasText: `@${ada.username}` });
  await expect(results).toHaveCount(1);
  await expect(results).toContainText('Back-end · Sênior · São Paulo, SP');

  // Another seniority finds nobody.
  await visitor.getByLabel('Senioridade').selectOption({ label: 'Júnior' });
  await visitor.getByRole('button', { name: 'Filtrar' }).click();
  await expect(visitor.getByText('Ninguém encontrado com esses filtros.')).toBeVisible();

  // The area on the profile links to the directory, filtered by it.
  await visitor.goto(`/@${ada.username}`);
  await visitor.getByRole('link', { name: 'Back-end' }).click();
  await expect(visitor).toHaveURL(/\/directory\?area=backend$/);
  await expect(visitor.getByLabel('Área')).toHaveValue('backend');
  await visitor.close();
});
