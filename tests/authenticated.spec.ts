import { test, expect } from '../fixtures';
import { API_BASE_URL } from './helpers/api';

test('restores the authenticated session after reload', async ({ page }) => {
  const authMeApiUrl = new URL('/auth/me', API_BASE_URL);

  await page.goto('/');

  await expect(
    page.getByRole('button', { name: 'Logout' }),
  ).toBeVisible();

  const authMeResponsePromise = page.waitForResponse((response) => {
    const responseUrl = new URL(response.url());

    return (
      response.request().method() === 'GET' &&
      responseUrl.origin === authMeApiUrl.origin &&
      responseUrl.pathname === authMeApiUrl.pathname
    );
  });

  await page.reload();

  const authMeResponse = await authMeResponsePromise;

  expect(authMeResponse.status()).toBe(200);
  await expect(
    page.getByRole('button', { name: 'Logout' }),
  ).toBeVisible();
  await expect(
    page.getByRole('tablist', { name: 'Workspace tabs' }),
  ).toBeVisible();
});
