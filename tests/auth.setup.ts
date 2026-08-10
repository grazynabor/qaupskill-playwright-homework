import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { test as setup, expect } from '../fixtures';

const authFile = path.resolve(__dirname, '..', 'playwright', '.auth', 'admin.json');
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@qaupskill.local';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'Admin123!';

setup('authenticate as bootstrap admin', async ({ page, loginPage }) => {
  await mkdir(path.dirname(authFile), { recursive: true });
  await loginPage.navigate();
  await loginPage.login(ADMIN_EMAIL, ADMIN_PASSWORD);

  await expect(
    page.getByRole('button', { name: 'Logout' }),
  ).toBeVisible();

  await page.context().storageState({ path: authFile });
});
