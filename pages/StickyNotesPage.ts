import { type Locator, type Page } from '@playwright/test';

export class StickyNotesPage {
  readonly page: Page;
  readonly navigationButton: Locator;
  readonly titleInput: Locator;
  readonly contentInput: Locator;
  readonly createStickyNoteButton: Locator;
  readonly refreshButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.navigationButton = page.getByRole('button', {
      name: 'Sticky Notes',
      exact: true,
    });
    this.titleInput = page.getByRole('textbox', {
      name: 'Title',
      exact: true,
    });
    this.contentInput = page.getByRole('textbox', {
      name: 'Content',
      exact: true,
    });
    this.createStickyNoteButton = page.getByRole('button', {
      name: 'Create Sticky Note',
      exact: true,
    });
    this.refreshButton = page.getByRole('button', {
      name: 'Refresh',
      exact: true,
    });
  }

  async open(): Promise<void> {
    await this.page.goto('/');
    await this.navigationButton.click();
  }

  async fillNote(title: string, content: string): Promise<void> {
    await this.titleInput.fill(title);
    await this.contentInput.fill(content);
  }

  async submitNote(): Promise<void> {
    await this.createStickyNoteButton.click();
  }

  async refreshNotes(): Promise<void> {
    await this.refreshButton.click();
  }

  async markNoteDone(title: string): Promise<void> {
    await this.noteByTitle(title)
      .getByRole('button', { name: 'Done', exact: true })
      .click();
  }

  noteByTitle(title: string): Locator {
    return this.page.getByRole('article').filter({
      has: this.page.getByRole('heading', { name: title, exact: true }),
    });
  }
}
