import { type Locator, type Page } from '@playwright/test';

export class ArchivePage {
  readonly page: Page;
  readonly heading: Locator;
  readonly archivedNotesList: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', {
      name: 'Completed sticky notes moved out of the active board',
      exact: true,
    });
    this.archivedNotesList = page.getByRole('list', {
      name: 'Archived sticky notes',
    });
  }

  noteByTitle(title: string): Locator {
    return this.archivedNotesList.getByRole('listitem').filter({
      has: this.page.getByRole('heading', {
        name: title,
        exact: true,
      }),
    });
  }
}
