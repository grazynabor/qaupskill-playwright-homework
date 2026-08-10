import { test, expect } from '../fixtures';

test('reuses authenticated state', async ({ page }) => {
  await page.goto('/');

  await expect(
    page.getByRole('button', { name: 'Logout' }),
  ).toBeVisible();
});
