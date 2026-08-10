import { test, expect } from '../fixtures';

const API_BASE_URL = 'http://localhost:4000';

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

const testUser = {
  fullName: 'Playwright Test User',
  email: `playwright-${Date.now()}@example.com`,
  password: 'Test123!',
  role: 'User' as const,
};

let adminToken: string;
let testUserId: number | undefined;

test.beforeAll(async ({ request }) => {
  const adminLoginResponse = await request.post(`${API_BASE_URL}/auth/login`, {
    data: {
      email: 'admin@qaupskill.local',
      password: 'Admin123!',
    },
  });

  expect(adminLoginResponse.status()).toBe(200);

  const adminLogin: LoginResponse = await adminLoginResponse.json();
  adminToken = adminLogin.token;

  expect(adminToken).toBeTruthy();
  expect(adminLogin.user.role).toBe('Admin');

  const createUserResponse = await request.post(`${API_BASE_URL}/people`, {
    headers: {
      Authorization: `Bearer ${adminToken}`,
    },
    data: testUser,
  });

  expect(createUserResponse.status()).toBe(201);

  const createdUser: PersonResponse = await createUserResponse.json();
  expect(createdUser.email).toBe(testUser.email);
  expect(createdUser.role).toBe(testUser.role);

  testUserId = createdUser.id;
  expect(testUserId).toBeGreaterThan(0);
});

test.beforeEach(async ({ loginPage }) => {
  await loginPage.navigate();
  await loginPage.login(testUser.email, testUser.password);
});

test(
  'authenticated workspace loads after login',
  { tag: '@smoke' },
  async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: testUser.fullName }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Logout' }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Note Assignments' }),
    ).toBeVisible();
  },
);

test.afterAll(async ({ request }) => {
  if (!testUserId) {
    return;
  }

  const deleteUserResponse = await request.delete(
    `${API_BASE_URL}/people/${testUserId}`,
    {
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    },
  );

  expect(deleteUserResponse.status()).toBe(204);
});
