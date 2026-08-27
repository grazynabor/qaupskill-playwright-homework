import { type Locator, type Page } from '@playwright/test';

export type WorkspaceNavigationLabel =
  | 'Users'
  | 'Create User'
  | 'Person'
  | 'Sticky Notes'
  | 'Note Assignments'
  | 'Statistics'
  | 'Archive';

export class WorkspacePage {
  readonly logoutButton: Locator;
  readonly navigationItems: Record<WorkspaceNavigationLabel, Locator>;

  constructor(page: Page) {
    this.logoutButton = page.getByRole('button', {
      name: 'Logout',
      exact: true,
    });
    const workspaceTabs = page.getByRole('tablist', {
      name: 'Workspace tabs',
    });

    this.navigationItems = {
      Users: workspaceTabs.getByRole('button', { name: 'Users', exact: true }),
      'Create User': workspaceTabs.getByRole('button', {
        name: 'Create User',
        exact: true,
      }),
      Person: workspaceTabs.getByRole('button', {
        name: 'Person',
        exact: true,
      }),
      'Sticky Notes': workspaceTabs.getByRole('button', {
        name: 'Sticky Notes',
        exact: true,
      }),
      'Note Assignments': workspaceTabs.getByRole('button', {
        name: 'Note Assignments',
        exact: true,
      }),
      Statistics: workspaceTabs.getByRole('button', {
        name: 'Statistics',
        exact: true,
      }),
      Archive: workspaceTabs.getByRole('button', {
        name: 'Archive',
        exact: true,
      }),
    };
  }

  async openSection(label: WorkspaceNavigationLabel): Promise<void> {
    await this.navigationItems[label].click();
  }

  async logout(): Promise<void> {
    await this.logoutButton.click();
  }
}
