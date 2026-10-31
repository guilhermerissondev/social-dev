import { expect, test } from '@playwright/test';

import { newUser, signUpAndConfirm } from './accounts.ts';

// End-to-end runs have no real GitHub; the API tests cover the GitHub data with a fake client.
test('GitHub settings for an account that is not connected', async ({ page, request }) => {
  const user = newUser();
  await signUpAndConfirm(page, request, user);

  await page.goto('/settings/profile');
  await page.getByRole('link', { name: /Conectar GitHub e mostrar repositórios fixados/ }).click();
  await expect(page.getByRole('heading', { name: 'GitHub', level: 1 })).toBeVisible();
  await expect(page.getByText('Sua conta ainda não está conectada ao GitHub.')).toBeVisible();
  // Either the connect button or, without GITHUB_CLIENT_ID, a note that it is not configured.
  await expect(
    page
      .getByRole('button', { name: 'Conectar GitHub' })
      .or(page.getByText('O login com GitHub não está configurado neste servidor.')),
  ).toBeVisible();

  // Failed links come back with ?error= and get an explanation.
  await page.goto('/settings/github?error=email_does_not_match');
  await expect(page.locator('main').getByRole('alert')).toContainText(
    'O e-mail principal da sua conta no GitHub é diferente',
  );

  // Without GitHub, the profile has no pinned repositories section.
  await page.goto(`/@${user.username}`);
  await expect(page.getByText(/Fixados no GitHub/)).toHaveCount(0);
});
