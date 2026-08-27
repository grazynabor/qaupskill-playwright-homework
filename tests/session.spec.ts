import { randomUUID } from 'node:crypto';
import { test, expect } from '../fixtures';

const API_BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:4000';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@qaupskill.local';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'Admin123!';

test.use({
  storageState: {
    cookies: [],
    origins: [],
  },
});

type Role = 'User' | 'Admin' | 'Configurator';

type PersonResponse = {
  id: number;
  fullName: string;
  email: string;
  role: Role;
  createdAt: string;
};

type LoginResponse = {
  token: string;
  user: PersonResponse;
};

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
        const adminLoginResponse = await request.post(
          `${API_BASE_URL}/auth/login`,
          {
            data: {
              email: ADMIN_EMAIL,
              password: ADMIN_PASSWORD,
            },
          },
        );

        expect(adminLoginResponse.status()).toBe(200);

        const adminLogin: LoginResponse = await adminLoginResponse.json();
        adminToken = adminLogin.token;

        expect(adminToken).toBeTruthy();
        expect(adminLogin.user.role).toBe('Admin');

        const createUserResponse = await request.post(
          `${API_BASE_URL}/people`,
          {
            headers: {
              Authorization: `Bearer ${adminToken}`,
            },
            data: temporaryUser,
          },
        );

        expect(createUserResponse.status()).toBe(201);

        const createdUser: PersonResponse = await createUserResponse.json();
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
        const deleteUserResponse = await request.delete(
          `${API_BASE_URL}/people/${temporaryUserId}`,
          {
            headers: {
              Authorization: `Bearer ${adminToken}`,
            },
          },
        );

        expect.soft(
          deleteUserResponse.status(),
          `Expected cleanup of temporary user ${temporaryUserId} to return 204`,
        ).toBe(204);
      }
    }
  },
);
