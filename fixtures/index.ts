import { test as base } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { StickyNotesPage } from '../pages/StickyNotesPage';
import { WorkspacePage } from '../pages/WorkspacePage';

type MyFixtures = {
  loginPage: LoginPage;
  stickyNotesPage: StickyNotesPage;
  workspacePage: WorkspacePage;
};

export const test = base.extend<MyFixtures>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  stickyNotesPage: async ({ page }, use) => {
    await use(new StickyNotesPage(page));
  },
  workspacePage: async ({ page }, use) => {
    await use(new WorkspacePage(page));
  },
});

export { expect } from '@playwright/test';
