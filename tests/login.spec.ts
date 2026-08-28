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

const testUser = {
  fullName: 'Playwright Test User',
  email: `playwright-${randomUUID()}@example.com`,
  password: 'Test123!',
  role: 'User' as const,
};

let adminToken: string;
let testUserId: number | undefined;

test.beforeAll(async ({ request }) => {
  adminToken = await authenticateAdmin(request);

  const createdUser = await createPerson(request, adminToken, testUser);

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
    await expect(
      page.getByRole('heading', {
        name: 'See how many sticky notes are assigned to each person',
        exact: true,
      }),
    ).toBeVisible();
  },
);

test.afterAll(async ({ request }) => {
  if (!testUserId) {
    return;
  }

  const deleteUserResponse = await deletePerson(
    request,
    adminToken,
    testUserId,
  );

  expect(deleteUserResponse.status()).toBe(204);
});
