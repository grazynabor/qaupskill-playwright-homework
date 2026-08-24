import { test as base } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { StickyNotesPage } from '../pages/StickyNotesPage';

type MyFixtures = {
  loginPage: LoginPage;
  stickyNotesPage: StickyNotesPage;
};

export const test = base.extend<MyFixtures>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  stickyNotesPage: async ({ page }, use) => {
    await use(new StickyNotesPage(page));
  },
});

export { expect } from '@playwright/test';
