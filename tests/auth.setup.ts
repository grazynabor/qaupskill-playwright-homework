import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { test as setup, expect } from '../fixtures';
import { ADMIN_CREDENTIALS } from './helpers/api';

const authFile = path.resolve(__dirname, '..', 'playwright', '.auth', 'admin.json');

setup('authenticate as bootstrap admin', async ({ page, loginPage }) => {
  await mkdir(path.dirname(authFile), { recursive: true });
  await loginPage.navigate();
  await loginPage.login(
    ADMIN_CREDENTIALS.email,
    ADMIN_CREDENTIALS.password,
  );

  await expect(
    page.getByRole('button', { name: 'Logout' }),
  ).toBeVisible();

  await page.context().storageState({ path: authFile });
});
