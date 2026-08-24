import { randomUUID } from 'node:crypto';
import { test, expect } from '../fixtures';

const API_BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:4000';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@qaupskill.local';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'Admin123!';

type Role = 'User' | 'Admin' | 'Configurator';

type LoginResponse = {
  token: string;
  user: {
    role: Role;
  };
};

type StickyNoteResponse = {
  id: number;
  title: string;
  content: string;
};

test(
  'admin can create a sticky note and it persists after refresh',
  async ({ page, request, stickyNotesPage }) => {
    const title = `Playwright sticky note ${randomUUID()}`;
    const content = 'Created by Playwright E2E test.';
    const loginApiUrl = new URL('/auth/login', API_BASE_URL).toString();
    const notesApiUrl = new URL('/notes', API_BASE_URL);

    const adminLoginResponse = await request.post(loginApiUrl, {
      data: {
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
      },
    });

    expect(adminLoginResponse.status()).toBe(200);

    const adminLogin: LoginResponse = await adminLoginResponse.json();
    const adminToken = adminLogin.token;

    expect(adminToken).toBeTruthy();
    expect(adminLogin.user.role).toBe('Admin');

    await stickyNotesPage.open();

    await expect(stickyNotesPage.titleInput).toBeVisible();
    await expect(stickyNotesPage.contentInput).toBeVisible();
    await expect(stickyNotesPage.createStickyNoteButton).toBeVisible();

    await stickyNotesPage.fillNote(title, content);

    let createdNoteId: number | undefined;

    try {
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
      createdNoteId = createdNote.id;

      await expect(
        page.getByText(`Created sticky note ${title}.`, { exact: true }),
      ).toBeVisible();
      await expect(stickyNotesPage.titleInput).toHaveValue('');
      await expect(stickyNotesPage.contentInput).toHaveValue('');

      let note = stickyNotesPage.noteByTitle(title);

      await expect(note).toBeVisible();
      await expect(note.getByText(content, { exact: true })).toBeVisible();
      await expect(note.getByText('Unassigned', { exact: true })).toBeVisible();

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

      const refreshedNotes: StickyNoteResponse[] = await refreshResponse.json();

      expect(refreshedNotes).toContainEqual(
        expect.objectContaining({
          id: createdNoteId,
          title,
          content,
        }),
      );

      note = stickyNotesPage.noteByTitle(title);

      await expect(note).toBeVisible();
      await expect(note.getByText(content, { exact: true })).toBeVisible();
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
