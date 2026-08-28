import { randomUUID } from 'node:crypto';
import { test, expect } from '../fixtures';
import {
  authenticateAdmin,
  createPerson,
  deletePerson,
} from './helpers/api';

test.use({
  storageState: {
    cookies: [],
    origins: [],
  },
});

test(
  'user can log out and remains logged out after reload',
  async ({ page, request, loginPage, workspacePage }) => {
    const temporaryUser = {
      fullName: 'Playwright Session User',
      email: `playwright-session-${randomUUID()}@example.com`,
      password: 'Test123!',
      role: 'User' as const,
    };
    let adminToken: string | undefined;
    let temporaryUserId: number | undefined;

    try {
      await test.step('Arrange: create isolated user', async () => {
        adminToken = await authenticateAdmin(request);

        const createdUser = await createPerson(
          request,
          adminToken,
          temporaryUser,
        );
        temporaryUserId = createdUser.id;

        expect(createdUser.id).toBeGreaterThan(0);
        expect(createdUser.email).toBe(temporaryUser.email);
        expect(createdUser.role).toBe(temporaryUser.role);
      });

      await test.step('Act: log in', async () => {
        await loginPage.navigate();
        await loginPage.login(temporaryUser.email, temporaryUser.password);

        await expect(
          page.getByRole('heading', {
            name: temporaryUser.fullName,
            exact: true,
          }),
        ).toBeVisible();
        await expect(
          page.getByRole('tablist', { name: 'Workspace tabs' }),
        ).toBeVisible();
        await expect(workspacePage.logoutButton).toBeVisible();
      });

      await test.step('Act: log out', async () => {
        await workspacePage.logout();

        await expect(loginPage.emailInput).toBeVisible();
        await expect(loginPage.passwordInput).toBeVisible();
        await expect(loginPage.loginButton).toBeVisible();
        await expect(workspacePage.logoutButton).toHaveCount(0);
        await expect(
          page.getByRole('tablist', { name: 'Workspace tabs' }),
        ).toHaveCount(0);
      });

      await test.step(
        'Assert: session remains cleared after reload',
        async () => {
          await page.reload();

          await expect(loginPage.loginButton).toBeVisible();
          await expect(workspacePage.logoutButton).toHaveCount(0);
          await expect(
            page.getByRole('tablist', { name: 'Workspace tabs' }),
          ).toHaveCount(0);
        },
      );
    } finally {
      if (temporaryUserId !== undefined && adminToken) {
        const deleteUserResponse = await deletePerson(
          request,
          adminToken,
          temporaryUserId,
        );

        expect.soft(
          deleteUserResponse.status(),
          `Expected cleanup of temporary user ${temporaryUserId} to return 204`,
        ).toBe(204);
      }
    }
  },
);
