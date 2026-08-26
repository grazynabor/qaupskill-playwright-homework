import { randomUUID } from 'node:crypto';
import { test, expect } from '../fixtures';
import type { WorkspaceNavigationLabel } from '../pages/WorkspacePage';

const API_BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:4000';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@qaupskill.local';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'Admin123!';
const TEMPORARY_ACCOUNT_PASSWORD = 'Test123!';

test.use({
  storageState: {
    cookies: [],
    origins: [],
  },
});

type Role = 'User' | 'Admin' | 'Configurator';
type TemporaryRole = Exclude<Role, 'Admin'>;

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

type Credentials = {
  email: string;
  password: string;
};

type RoleScenario = {
  role: Role;
  credentials: Credentials;
  allowedNavigation: WorkspaceNavigationLabel[];
  restrictedNavigation: WorkspaceNavigationLabel[];
};

const temporaryAccounts: Record<
  TemporaryRole,
  Credentials & { fullName: string; role: TemporaryRole }
> = {
  Configurator: {
    fullName: 'Playwright RBAC Configurator',
    email: `playwright-rbac-configurator-${randomUUID()}@example.com`,
    password: TEMPORARY_ACCOUNT_PASSWORD,
    role: 'Configurator',
  },
  User: {
    fullName: 'Playwright RBAC User',
    email: `playwright-rbac-user-${randomUUID()}@example.com`,
    password: TEMPORARY_ACCOUNT_PASSWORD,
    role: 'User',
  },
};

const roleScenarios: RoleScenario[] = [
  {
    role: 'Admin',
    credentials: {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    },
    allowedNavigation: [
      'Users',
      'Create User',
      'Person',
      'Sticky Notes',
      'Note Assignments',
      'Statistics',
      'Archive',
    ],
    restrictedNavigation: [],
  },
  {
    role: 'Configurator',
    credentials: temporaryAccounts.Configurator,
    allowedNavigation: [
      'Person',
      'Sticky Notes',
      'Note Assignments',
      'Statistics',
      'Archive',
    ],
    restrictedNavigation: ['Users', 'Create User'],
  },
  {
    role: 'User',
    credentials: temporaryAccounts.User,
    allowedNavigation: [
      'Sticky Notes',
      'Note Assignments',
      'Statistics',
    ],
    restrictedNavigation: ['Users', 'Create User', 'Person', 'Archive'],
  },
];

let adminToken: string;
const temporaryAccountIds: Partial<Record<TemporaryRole, number>> = {};

test.beforeAll(async ({ request }) => {
  const adminLoginResponse = await request.post(`${API_BASE_URL}/auth/login`, {
    data: {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    },
  });

  expect(adminLoginResponse.status()).toBe(200);

  const adminLogin: LoginResponse = await adminLoginResponse.json();
  adminToken = adminLogin.token;

  expect(adminToken).toBeTruthy();
  expect(adminLogin.user.role).toBe('Admin');

  for (const role of ['Configurator', 'User'] as const) {
    const account = temporaryAccounts[role];
    const createAccountResponse = await request.post(
      `${API_BASE_URL}/people`,
      {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
        data: account,
      },
    );

    expect(createAccountResponse.status()).toBe(201);

    const createdAccount: PersonResponse = await createAccountResponse.json();
    temporaryAccountIds[role] = createdAccount.id;

    expect(createdAccount.id).toBeGreaterThan(0);
    expect(createdAccount.email).toBe(account.email);
    expect(createdAccount.role).toBe(role);
  }
});

for (const scenario of roleScenarios) {
  test(
    `${scenario.role} sees only permitted workspace navigation`,
    { tag: '@rbac' },
    async ({ loginPage, workspacePage }) => {
      await test.step(`Log in as ${scenario.role}`, async () => {
        await loginPage.navigate();
        await loginPage.login(
          scenario.credentials.email,
          scenario.credentials.password,
        );
      });

      await test.step('Verify allowed navigation', async () => {
        for (const label of scenario.allowedNavigation) {
          await expect(workspacePage.navigationItems[label]).toBeVisible();
        }
      });

      if (scenario.restrictedNavigation.length > 0) {
        await test.step('Verify restricted navigation is not exposed', async () => {
          for (const label of scenario.restrictedNavigation) {
            await expect(workspacePage.navigationItems[label]).toHaveCount(0);
          }
        });
      }
    },
  );
}

test.afterAll(async ({ request }) => {
  for (const role of ['Configurator', 'User'] as const) {
    const accountId = temporaryAccountIds[role];

    if (!accountId) {
      continue;
    }

    const deleteAccountResponse = await request.delete(
      `${API_BASE_URL}/people/${accountId}`,
      {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      },
    );

    expect.soft(
      deleteAccountResponse.status(),
      `cleanup ${role} account`,
    ).toBe(204);
  }
});
