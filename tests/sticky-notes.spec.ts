import { randomUUID } from 'node:crypto';
import { test, expect } from '../fixtures';
import { API_BASE_URL, authenticateAdmin } from './helpers/api';

type StickyNoteResponse = {
  id: number;
  title: string;
  content: string;
  isDone: boolean;
};

test(
  'admin can create a sticky note and it persists after refresh',
  async ({ page, request, stickyNotesPage }) => {
    const title = `Playwright sticky note ${randomUUID()}`;
    const content = 'Created by Playwright E2E test.';
    const notesApiUrl = new URL('/notes', API_BASE_URL);

    const adminToken = await test.step(
      'Arrange: prepare API cleanup access',
      async () => authenticateAdmin(request),
    );

    await test.step('Arrange: open Sticky Notes', async () => {
      await stickyNotesPage.open();

      await expect(stickyNotesPage.titleInput).toBeVisible();
      await expect(stickyNotesPage.contentInput).toBeVisible();
      await expect(stickyNotesPage.createStickyNoteButton).toBeVisible();
    });

    let createdNoteId: number | undefined;

    try {
      await test.step('Act: create sticky note', async () => {
        await stickyNotesPage.fillNote(title, content);

        const createNoteResponsePromise = page.waitForResponse((response) => {
          const responseUrl = new URL(response.url());

          return (
            response.request().method() === 'POST' &&
            responseUrl.origin === notesApiUrl.origin &&
            responseUrl.pathname === notesApiUrl.pathname
          );
        });

        await stickyNotesPage.submitNote();

        const createNoteResponse = await createNoteResponsePromise;

        expect(createNoteResponse.status()).toBe(201);

        const createdNote: StickyNoteResponse = await createNoteResponse.json();

        expect(createdNote.id).toBeGreaterThan(0);
        expect(createdNote).toMatchObject({ title, content });
        createdNoteId = createdNote.id;
      });

      await test.step('Assert: verify created note', async () => {
        await expect(
          page.getByText(`Created sticky note ${title}.`, { exact: true }),
        ).toBeVisible();
        await expect(stickyNotesPage.titleInput).toHaveValue('');
        await expect(stickyNotesPage.contentInput).toHaveValue('');

        const note = stickyNotesPage.noteByTitle(title);

        await expect(note).toBeVisible();
        await expect(note.getByText(content, { exact: true })).toBeVisible();
        await expect(
          note.getByText('Unassigned', { exact: true }),
        ).toBeVisible();
      });

      await test.step('Assert: verify persistence after refresh', async () => {
        const refreshResponsePromise = page.waitForResponse((response) => {
          const responseUrl = new URL(response.url());

          return (
            response.request().method() === 'GET' &&
            responseUrl.origin === notesApiUrl.origin &&
            responseUrl.pathname === notesApiUrl.pathname
          );
        });

        await stickyNotesPage.refreshNotes();

        const refreshResponse = await refreshResponsePromise;

        expect(refreshResponse.status()).toBe(200);

        const refreshedNotes: StickyNoteResponse[] =
          await refreshResponse.json();

        expect(refreshedNotes).toContainEqual(
          expect.objectContaining({
            id: createdNoteId,
            title,
            content,
          }),
        );

        const note = stickyNotesPage.noteByTitle(title);

        await expect(note).toBeVisible();
        await expect(note.getByText(content, { exact: true })).toBeVisible();
      });
    } finally {
      if (createdNoteId !== undefined) {
        const deleteNoteResponse = await request.delete(
          new URL(`/notes/${createdNoteId}`, API_BASE_URL).toString(),
          {
            headers: {
              Authorization: `Bearer ${adminToken}`,
            },
          },
        );

        expect.soft(
          deleteNoteResponse.status(),
          `Expected cleanup of sticky note ${createdNoteId} to return 204`,
        ).toBe(204);
      }
    }
  },
);

test(
  'admin can complete a sticky note and find it in Archive',
  async ({
    page,
    request,
    stickyNotesPage,
    workspacePage,
    archivePage,
  }) => {
    const title = `Playwright lifecycle note ${randomUUID()}`;
    const content = 'Completed through the Sticky Notes lifecycle E2E test.';
    const notesApiUrl = new URL('/notes', API_BASE_URL);

    const adminToken = await test.step(
      'Arrange: prepare API cleanup access',
      async () => authenticateAdmin(request),
    );

    let createdNoteId: number | undefined;

    try {
      await test.step('Arrange: create sticky note', async () => {
        await stickyNotesPage.open();
        await stickyNotesPage.fillNote(title, content);

        const createNoteResponsePromise = page.waitForResponse((response) => {
          const responseUrl = new URL(response.url());

          return (
            response.request().method() === 'POST' &&
            responseUrl.origin === notesApiUrl.origin &&
            responseUrl.pathname === notesApiUrl.pathname
          );
        });

        await stickyNotesPage.submitNote();

        const createNoteResponse = await createNoteResponsePromise;

        expect(createNoteResponse.status()).toBe(201);

        const createdNote: StickyNoteResponse = await createNoteResponse.json();
        createdNoteId = createdNote.id;

        expect(createdNote.id).toBeGreaterThan(0);
        expect(createdNote).toMatchObject({ title, content, isDone: false });

        const activeNote = stickyNotesPage.noteByTitle(title);

        await expect(activeNote).toBeVisible();
        await expect(
          activeNote.getByRole('heading', { name: title, exact: true }),
        ).toBeVisible();
        await expect(activeNote.getByText(content, { exact: true })).toBeVisible();
      });

      await test.step('Act: mark sticky note as done', async () => {
        if (createdNoteId === undefined) {
          throw new Error('Created sticky note ID was not captured.');
        }

        const markDoneApiUrl = new URL(
          `/notes/${createdNoteId}/done`,
          API_BASE_URL,
        );
        const markDoneResponsePromise = page.waitForResponse((response) => {
          const responseUrl = new URL(response.url());

          return (
            response.request().method() === 'PATCH' &&
            responseUrl.origin === markDoneApiUrl.origin &&
            responseUrl.pathname === markDoneApiUrl.pathname
          );
        });

        await stickyNotesPage.markNoteDone(title);

        const markDoneResponse = await markDoneResponsePromise;

        expect(markDoneResponse.status()).toBe(200);

        const completedNote: StickyNoteResponse =
          await markDoneResponse.json();

        expect(completedNote).toMatchObject({
          id: createdNoteId,
          title,
          content,
          isDone: true,
        });
        await expect(
          page.getByText(`Marked ${title} as done.`, { exact: true }),
        ).toBeVisible();
      });

      await test.step('Assert: note leaves active board', async () => {
        await expect(stickyNotesPage.noteByTitle(title)).toBeHidden();
      });

      await test.step('Assert: note appears in Archive', async () => {
        await workspacePage.openSection('Archive');

        await expect(archivePage.heading).toBeVisible();

        const archivedNote = archivePage.noteByTitle(title);

        await expect(archivedNote).toBeVisible();
        await expect(
          archivedNote.getByRole('heading', { name: title, exact: true }),
        ).toBeVisible();
        await expect(
          archivedNote.getByText(content, { exact: true }),
        ).toBeVisible();
      });
    } finally {
      if (createdNoteId !== undefined) {
        const deleteNoteResponse = await request.delete(
          new URL(`/notes/${createdNoteId}`, API_BASE_URL).toString(),
          {
            headers: {
              Authorization: `Bearer ${adminToken}`,
            },
          },
        );

        expect.soft(
          deleteNoteResponse.status(),
          `Expected cleanup of sticky note ${createdNoteId} to return 204`,
        ).toBe(204);
      }
    }
  },
);
