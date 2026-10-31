import { expect, test } from '@playwright/test';

import { newUser, signUp, signUpAndConfirm } from './accounts.ts';
import { latestLinkSentTo } from './mailpit.ts';

test('onboarding sets up the stack, follows tags and suggests people', async ({
  browser,
  request,
}) => {
  const tech = `e2e_${Date.now().toString(36)}`;

  // Someone with the same stack is already here.
  const veteran = newUser();
  const veteranPage = await browser.newPage();
  await signUpAndConfirm(veteranPage, request, veteran);
  await veteranPage.goto('/settings/profile');
  await veteranPage.getByLabel('Tecnologias').fill(tech);
  await veteranPage.getByRole('button', { name: 'Salvar perfil' }).click();
  await expect(veteranPage).toHaveURL(new RegExp(`/@${veteran.username}$`));
  await veteranPage.close();

  const newcomer = newUser();
  const page = await browser.newPage();
  await signUp(page, newcomer);
  await page.goto(await latestLinkSentTo(request, newcomer.email));
  await expect(page.getByText('Passo 1 de 3')).toBeVisible();

  // Step 1: stack and area.
  await page.getByLabel('Tecnologias que você usa').fill(`${tech}, typescript`);
  await page.getByLabel('Área').selectOption({ label: 'Back-end' });
  await page.getByRole('button', { name: 'Continuar' }).click();

  // Step 2: the stack's tags come selected.
  await expect(page.getByText('Passo 2 de 3')).toBeVisible();
  await expect(page.getByRole('checkbox', { name: `#${tech}` })).toBeChecked();
  await page.getByRole('button', { name: 'Continuar' }).click();

  // Step 3: the veteran is suggested for the shared stack.
  await expect(page.getByText('Passo 3 de 3')).toBeVisible();
  const suggestion = page.getByRole('listitem').filter({ hasText: `@${veteran.username}` });
  await expect(suggestion).toContainText(`Também usa #${tech}`);
  const follow = suggestion.getByRole('button', { name: `Seguir @${veteran.username}` });
  await follow.click();
  await expect(follow).toHaveAttribute('aria-pressed', 'true');

  await page.getByRole('button', { name: 'Ir para o feed' }).click();
  await expect(page).toHaveURL(/\/home$/);

  // Done: the feed no longer sends them back, and the tag is followed.
  await page.goto('/home');
  await expect(page).toHaveURL(/\/home$/);
  await page.goto(`/tags/${tech}`);
  await expect(page.getByRole('button', { name: `Seguir #${tech}` })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.close();
});
