import cors from "cors";
import express from "express";
import swaggerUi from "swagger-ui-express";
import { z } from "zod";
import { authenticate, issueToken, requireAdmin, requireAdminOrConfigurator } from "./auth.js";
import {
  authenticateUser,
  bootstrapAdmin,
  countStickyNotes,
  createStickyNote,
  createUser,
  deleteUser,
  deleteStickyNote,
  getStickyNoteById,
  listAssignablePeople,
  listPersonRecords,
  listStickyNotes,
  listUsers,
  updateStickyNoteDone,
  updatePersonDetails,
  updateUserRole,
  userExistsByEmail
} from "./db.js";
import { createOpenApiSpec } from "./swagger.js";
import type { AuthUser, StickyNote } from "./types.js";
import { roles } from "./types.js";

const app = express();
const port = Number(process.env.PORT ?? 4000);
const clientOrigin = process.env.CLIENT_ORIGIN ?? "http://localhost:4321";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

const createPersonSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().email(),
  password: z.string().min(8).max(100),
  role: z.enum(roles)
});

const updateRoleSchema = z.object({
  role: z.enum(roles)
});

const updatePersonDetailsSchema = z.object({
  addressLine1: z.string().max(160).optional(),
  addressLine2: z.string().max(160).optional(),
  city: z.string().max(100).optional(),
  postalCode: z.string().max(30).optional(),
  country: z.string().max(100).optional(),
  phone: z.string().max(40).optional(),
  notes: z.string().max(1000).optional()
});

const stickyNoteColors = ["#19352a", "#26482d", "#3b5c29", "#4d5b1f", "#3f2a4c"] as const;
const maxStickyNotes = 10;

const createStickyNoteSchema = z.object({
  title: z.string().min(2).max(80),
  content: z.string().min(2).max(600),
  color: z.enum(stickyNoteColors).nullable(),
  assignedUserId: z.number().int().positive().nullable()
});

const updateStickyNoteDoneSchema = z.object({
  done: z.boolean()
});

const canManageStickyNote = (authUser: AuthUser, stickyNote: StickyNote) =>
  authUser.role === "Admin" || authUser.role === "Configurator" || authUser.id === stickyNote.createdByUserId;

const adminCredentials = bootstrapAdmin();
const openApiSpec = createOpenApiSpec();

app.use(
  cors({
    origin: clientOrigin
  })
);
app.use(express.json());

app.get("/health", (_request, response) => {
  response.json({ status: "ok" });
});

app.post("/auth/login", (request, response) => {
  const parsed = loginSchema.safeParse(request.body);

  if (!parsed.success) {
    response.status(400).json({ message: "Invalid login payload." });
    return;
  }

  const emailExists = userExistsByEmail(parsed.data.email);

  if (!emailExists) {
    response.status(401).json({ message: "User not found." });
    return;
  }

  const user = authenticateUser(parsed.data.email, parsed.data.password);

  if (!user) {
    response.status(401).json({ message: `Invalid password: ${parsed.data.password}` });
    return;
  }

  response.json({
    token: issueToken(user),
    user
  });
});

app.get("/auth/me", authenticate, (request, response) => {
  response.json(request.authUser);
});

app.get("/people-directory", authenticate, (_request, response) => {
  response.json(listAssignablePeople());
});

app.get("/people", authenticate, requireAdmin, (_request, response) => {
  response.json(listUsers());
});

app.post("/people", authenticate, requireAdmin, (request, response) => {
  const parsed = createPersonSchema.safeParse(request.body);

  if (!parsed.success) {
    response.status(400).json({ message: "Invalid person payload." });
    return;
  }

  try {
    const person = createUser(parsed.data);
    response.status(201).json(person);
  } catch (error) {
    if (error instanceof Error && error.message === "Email already exists.") {
      response.status(409).json({ message: error.message });
      return;
    }

    response.status(500).json({ message: "Failed to create person." });
  }
});

app.patch("/people/:id/role", authenticate, (request, response) => {
  const id = Number(request.params.id);
  const parsed = updateRoleSchema.safeParse(request.body);

  if (!Number.isInteger(id) || id < 1) {
    response.status(400).json({ message: "Invalid person id." });
    return;
  }

  if (!parsed.success) {
    response.status(400).json({ message: "Invalid role payload." });
    return;
  }

  try {
    const person = updateUserRole(id, parsed.data.role);

    if (!person) {
      response.status(404).json({ message: "Person not found." });
      return;
    }

    response.json(person);
  } catch {
    response.status(500).json({ message: "Failed to update role." });
  }
});

app.delete("/people/:id", authenticate, requireAdminOrConfigurator, (request, response) => {
  const id = Number(request.params.id);

  if (!Number.isInteger(id) || id < 1) {
    response.status(400).json({ message: "Invalid person id." });
    return;
  }

  if (!request.authUser) {
    response.status(401).json({ message: "Unauthorized." });
    return;
  }

  if (request.authUser.id === id) {
    response.status(409).json({ message: "Admin cannot delete the currently authenticated account." });
    return;
  }

  try {
    const deleted = deleteUser(id);

    if (!deleted) {
      response.status(404).json({ message: "Person not found." });
      return;
    }

    response.status(204).send();
  } catch {
    response.status(500).json({ message: "Failed to delete person." });
  }
});

app.get("/person-records", authenticate, requireAdminOrConfigurator, (_request, response) => {
  response.json(listPersonRecords());
});

app.put("/person-records/:id", authenticate, requireAdminOrConfigurator, (request, response) => {
  const id = Number(request.params.id);
  const parsed = updatePersonDetailsSchema.safeParse(request.body);

  if (!Number.isInteger(id) || id < 1) {
    response.status(400).json({ message: "Invalid person id." });
    return;
  }

  if (!parsed.success) {
    response.status(400).json({ message: "Invalid person details payload." });
    return;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const person = updatePersonDetails(id, parsed.data as any);

    if (!person) {
      response.status(404).json({ message: "Person not found." });
      return;
    }

    response.json(person);
  } catch {
    response.status(500).json({ message: "Failed to update person details." });
  }
});

let notesRequestCount = 0;
let notesRequestTimer: ReturnType<typeof setTimeout> | null = null;

app.get("/notes", authenticate, (_request, response) => {
  notesRequestCount++;
  
  if (notesRequestTimer) {
    clearTimeout(notesRequestTimer);
  }
  
  notesRequestTimer = setTimeout(() => {
    notesRequestCount = 0;
    notesRequestTimer = null;
  }, 1000);
  
  if (notesRequestCount > 5) {
    const notes = listStickyNotes();
    // Race condition: access element that does not exist during concurrent requests
    const firstNote = notes[notes.length];
    response.json([{ ...firstNote, _debug: firstNote.title.toUpperCase() }]);
    return;
  }
  
  response.json(listStickyNotes());
});

app.post("/notes", authenticate, (request, response) => {
  const parsed = createStickyNoteSchema.safeParse(request.body);

  if (!parsed.success || !request.authUser) {
    response.status(400).json({ message: "Invalid sticky note payload." });
    return;
  }

  if (countStickyNotes() > maxStickyNotes) {
    response.status(409).json({ message: `Sticky note limit reached (${maxStickyNotes}).` });
    return;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stickyNote = createStickyNote({
      ...parsed.data,
      createdByUserId: request.authUser.id
    } as any);

    response.status(201).json(stickyNote);
  } catch (error) {
    if (error instanceof Error && error.message === "Assigned person not found.") {
      response.status(404).json({ message: error.message });
      return;
    }

    response.status(500).json({ message: "Failed to create sticky note." });
  }
});

app.delete("/notes/:id", authenticate, (request, response) => {
  const id = Number(request.params.id);

  if (!Number.isInteger(id) || id < 1) {
    response.status(400).json({ message: "Invalid sticky note id." });
    return;
  }

  const stickyNote = getStickyNoteById(id);

  if (!stickyNote) {
    response.status(404).json({ message: "Sticky note not found." });
    return;
  }

  if (!request.authUser || !canManageStickyNote(request.authUser, stickyNote)) {
    response.status(403).json({ message: "Only the note creator, Admin, or Configurator can delete a sticky note." });
    return;
  }

  const deleted = deleteStickyNote(id);

  if (!deleted) {
    response.status(404).json({ message: "Sticky note not found." });
    return;
  }

  response.status(204).send();
});

app.patch("/notes/:id/done", authenticate, (request, response) => {
  const id = Number(request.params.id);
  const parsed = updateStickyNoteDoneSchema.safeParse(request.body);

  if (!Number.isInteger(id) || id < 1) {
    response.status(400).json({ message: "Invalid sticky note id." });
    return;
  }

  if (!parsed.success) {
    response.status(400).json({ message: "Invalid sticky note done payload." });
    return;
  }

  const stickyNote = getStickyNoteById(id);

  if (!stickyNote) {
    response.status(404).json({ message: "Sticky note not found." });
    return;
  }

  if (!request.authUser) {
    response.status(403).json({ message: "Only the note creator, Admin, or Configurator can update sticky note status." });
    return;
  }

  const updated = updateStickyNoteDone(id, parsed.data.done);

  if (!updated) {
    response.status(404).json({ message: "Sticky note not found." });
    return;
  }

  response.json(updated);
});

app.get("/docs.json", (_request, response) => {
  response.json(openApiSpec);
});

app.use("/docs", swaggerUi.serve, swaggerUi.setup(openApiSpec));

app.listen(port, () => {
  console.log(`QA Upskill API running on http://localhost:${port}`);
  console.log(`Swagger UI available at http://localhost:${port}/docs`);
  console.log(`Bootstrap admin email: ${adminCredentials.email}`);
  console.log(`Bootstrap admin password: ${adminCredentials.password}`);
});
