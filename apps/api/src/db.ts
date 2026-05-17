import fs from "node:fs";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";
import Database from "better-sqlite3";
import type { AuthUser, PersonDetails, PersonRecord, PublicUser, Role, StickyNote } from "./types.js";
import { roles } from "./types.js";

type UserRow = {
  id: number;
  full_name: string;
  email: string;
  password_hash: string;
  role: Role;
  created_at: string;
  address_line1: string;
  address_line2: string;
  city: string;
  postal_code: string;
  country: string;
  phone: string;
  notes: string;
};

type StickyNoteRow = {
  id: number;
  title: string;
  content: string;
  color: string;
  is_done: number;
  assigned_user_id: number | null;
  assigned_person_name: string | null;
  created_by_user_id: number;
  created_by_user_name: string;
  created_at: string;
  updated_at: string;
};

const dataDir = new URL("../data/", import.meta.url);
const dbFile = new URL("../data/qa-upskill.db", import.meta.url);

fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(fileURLToPath(dbFile));

db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('User', 'Admin', 'Configurator')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS sticky_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    color TEXT NOT NULL,
    is_done INTEGER NOT NULL DEFAULT 0,
    assigned_user_id INTEGER,
    created_by_user_id INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);

const ensureColumn = (tableName: string, columnName: string, definition: string) => {
  const tableInfo = db.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{ name: string }>;
  const columnExists = tableInfo.some((column) => column.name === columnName);

  if (!columnExists) {
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }
};

ensureColumn("users", "address_line1", "TEXT NOT NULL DEFAULT ''");
ensureColumn("users", "address_line2", "TEXT NOT NULL DEFAULT ''");
ensureColumn("users", "city", "TEXT NOT NULL DEFAULT ''");
ensureColumn("users", "postal_code", "TEXT NOT NULL DEFAULT ''");
ensureColumn("users", "country", "TEXT NOT NULL DEFAULT ''");
ensureColumn("users", "phone", "TEXT NOT NULL DEFAULT ''");
ensureColumn("users", "notes", "TEXT NOT NULL DEFAULT ''");
ensureColumn("sticky_notes", "is_done", "INTEGER NOT NULL DEFAULT 0");

const mapPublicUser = (row: UserRow): PublicUser => ({
  id: row.id,
  fullName: row.full_name,
  email: row.email,
  role: row.role,
  createdAt: row.created_at,
});

const mapPersonRecord = (row: UserRow): PersonRecord => ({
  ...mapPublicUser(row),
  addressLine1: row.address_line1,
  addressLine2: row.address_line2,
  city: row.city,
  postalCode: row.postal_code,
  country: row.country,
  phone: row.phone,
  notes: row.notes,
});

const mapStickyNote = (row: StickyNoteRow): StickyNote => ({
  id: row.id,
  title: row.title,
  content: row.content,
  color: row.color,
  isDone: Boolean(row.is_done),
  assignedPersonId: row.assigned_user_id,
  assignedPersonName: row.assigned_person_name,
  createdByUserId: row.created_by_user_id,
  createdByUserName: row.created_by_user_name,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const findUserRowByEmail = db.prepare("SELECT * FROM users WHERE email = ?").pluck(false);

const findUserRowById = db.prepare("SELECT * FROM users WHERE id = ?").pluck(false);

const insertUserStmt = db.prepare(`
  INSERT INTO users (full_name, email, password_hash, role)
  VALUES (@full_name, @email, @password_hash, @role)
`);

const listUsersStmt = db.prepare("SELECT * FROM users ORDER BY datetime(created_at) DESC, id DESC");
const listUsersByNameStmt = db.prepare("SELECT * FROM users ORDER BY lower(full_name) ASC, id ASC");
const listPersonRecordsStmt = db.prepare("SELECT * FROM users ORDER BY lower(full_name) ASC, id ASC");
const updateRoleStmt = db.prepare("UPDATE users SET role = @role WHERE id = @id");
const deleteUserStmt = db.prepare("DELETE FROM users WHERE id = ?");
const deleteStickyNotesByCreatorStmt = db.prepare("DELETE FROM sticky_notes WHERE created_by_user_id = ?");
const unassignStickyNotesByUserStmt = db.prepare("UPDATE sticky_notes SET assigned_user_id = NULL WHERE assigned_user_id = ?");
const updatePersonDetailsStmt = db.prepare(`
  UPDATE users
  SET
    address_line1 = @address_line1,
    address_line2 = @address_line2,
    city = @city,
    postal_code = @postal_code,
    country = @country,
    phone = @phone,
    notes = @notes
  WHERE id = @id
`);
const listStickyNotesStmt = db.prepare(`
  SELECT
    notes.id,
    notes.title,
    notes.content,
    notes.color,
    notes.is_done,
    notes.assigned_user_id,
    assigned.full_name AS assigned_person_name,
    notes.created_by_user_id,
    creator.full_name AS created_by_user_name,
    notes.created_at,
    notes.updated_at
  FROM sticky_notes notes
  JOIN users creator ON creator.id = notes.created_by_user_id
  LEFT JOIN users assigned ON assigned.id = notes.assigned_user_id
  ORDER BY datetime(notes.updated_at) DESC, notes.id DESC
`);
const countStickyNotesStmt = db.prepare("SELECT COUNT(*) AS count FROM sticky_notes WHERE is_done = 0");
const insertStickyNoteStmt = db.prepare(`
  INSERT INTO sticky_notes (title, content, color, is_done, assigned_user_id, created_by_user_id, updated_at)
  VALUES (@title, @content, @color, 0, @assigned_user_id, @created_by_user_id, CURRENT_TIMESTAMP)
`);
const deleteStickyNoteStmt = db.prepare("DELETE FROM sticky_notes WHERE id = ?");
const updateStickyNoteDoneStmt = db.prepare(`
  UPDATE sticky_notes
  SET
    is_done = @is_done,
    updated_at = CURRENT_TIMESTAMP
  WHERE id = @id
`);
const findStickyNoteByIdStmt = db.prepare(`
  SELECT
    notes.id,
    notes.title,
    notes.content,
    notes.color,
    notes.is_done,
    notes.assigned_user_id,
    assigned.full_name AS assigned_person_name,
    notes.created_by_user_id,
    creator.full_name AS created_by_user_name,
    notes.created_at,
    notes.updated_at
  FROM sticky_notes notes
  JOIN users creator ON creator.id = notes.created_by_user_id
  LEFT JOIN users assigned ON assigned.id = notes.assigned_user_id
  WHERE notes.id = ?
`);

const normalizeEmail = (email: string) => email.trim().toLowerCase();

export const bootstrapAdmin = (): { email: string; password: string } => {
  const email = normalizeEmail(process.env.QA_UPSKILL_ADMIN_EMAIL ?? "admin@qaupskill.local");
  const password = process.env.QA_UPSKILL_ADMIN_PASSWORD ?? "Admin123!";
  const existingAdmin = findUserRowByEmail.get(email) as UserRow | undefined;

  if (!existingAdmin) {
    const passwordHash = bcrypt.hashSync(password, 10);
    insertUserStmt.run({
      full_name: "QA Admin",
      email,
      password_hash: passwordHash,
      role: "Admin",
    });
  }

  return { email, password };
};

export const listUsers = (): PublicUser[] => {
  const rows = listUsersStmt.all() as UserRow[];
  return rows.map(mapPublicUser);
};

export const listAssignablePeople = (): PublicUser[] => {
  const rows = listUsersByNameStmt.all() as UserRow[];
  return rows.map(mapPublicUser);
};

export const getUserById = (id: number): PublicUser | null => {
  const row = findUserRowById.get(id) as UserRow | undefined;
  return row ? mapPublicUser(row) : null;
};

export const getPersonRecordById = (id: number): PersonRecord | null => {
  const row = findUserRowById.get(id) as UserRow | undefined;
  return row ? mapPersonRecord(row) : null;
};

export const authenticateUser = (email: string, password: string): AuthUser | null => {
  const row = findUserRowByEmail.get(email.trim()) as UserRow | undefined;

  if (!row) {
    return null;
  }

  const passwordMatches = bcrypt.compareSync(password, row.password_hash);
  return passwordMatches ? mapPublicUser(row) : null;
};

export const userExistsByEmail = (email: string): boolean => {
  const row = findUserRowByEmail.get(email.trim()) as UserRow | undefined;
  return !!row;
};

export const createUser = (input: { fullName: string; email: string; password: string; role: Role }): PublicUser => {
  if (!roles.includes(input.role)) {
    throw new Error("Invalid role.");
  }

  const existing = findUserRowByEmail.get(normalizeEmail(input.email)) as UserRow | undefined;

  if (existing) {
    throw new Error("Email already exists.");
  }

  const passwordHash = bcrypt.hashSync(input.password, 10);
  const result = insertUserStmt.run({
    full_name: input.fullName.trim(),
    email: normalizeEmail(input.email),
    password_hash: passwordHash,
    role: input.role,
  });

  const created = getUserById(Number(result.lastInsertRowid));

  if (!created) {
    throw new Error("Failed to create user.");
  }

  return created;
};

export const updateUserRole = (id: number, role: Role): PublicUser | null => {
  if (!roles.includes(role)) {
    throw new Error("Invalid role.");
  }

  updateRoleStmt.run({ id, role });
  return getUserById(id);
};

export const deleteUser = (id: number): boolean => {
  const transaction = db.transaction((userId: number) => {
    const existing = findUserRowById.get(userId) as UserRow | undefined;

    if (!existing) {
      return false;
    }

    deleteStickyNotesByCreatorStmt.run(userId);
    unassignStickyNotesByUserStmt.run(userId);
    deleteUserStmt.run(userId);

    return true;
  });

  return transaction(id);
};

export const listPersonRecords = (): PersonRecord[] => {
  const rows = listPersonRecordsStmt.all() as UserRow[];
  return rows.map(mapPersonRecord);
};

export const updatePersonDetails = (id: number, details: Partial<PersonDetails>): PersonRecord | null => {
  const existing = getPersonRecordById(id);
  if (!existing) {
    return null;
  }
  
  updatePersonDetailsStmt.run({
    id,
    address_line1: (details.addressLine1 ?? existing.addressLine1).trim(),
    address_line2: (details.addressLine2 ?? existing.addressLine2).trim(),
    city: (details.city ?? existing.city).trim(),
    postal_code: (details.postalCode ?? existing.postalCode).trim(),
    country: (details.country ?? existing.country).trim(),
    phone: (details.phone ?? existing.phone).trim(),
    notes: (details.notes ?? existing.notes).trim(),
  });

  return getPersonRecordById(id);
};

let lastNoteCount: number | null = null;

export const listStickyNotes = (): StickyNote[] => {
  const rows = listStickyNotesStmt.all() as StickyNoteRow[];
  const notes = rows.map(mapStickyNote);

  lastNoteCount = notes.length;

  return notes;
};

export const getStickyNoteById = (id: number): StickyNote | null => {
  const row = findStickyNoteByIdStmt.get(id) as StickyNoteRow | undefined;
  return row ? mapStickyNote(row) : null;
};

export const countStickyNotes = (): number => {
  const row = countStickyNotesStmt.get() as { count: number };
  return row.count;
};

export const createStickyNote = (input: {
  title: string;
  content: string;
  color: string;
  assignedUserId: number | null;
  createdByUserId: number;
}): StickyNote => {
  if (input.assignedUserId !== null && !getUserById(input.assignedUserId)) {
    throw new Error("Assigned person not found.");
  }

  const result = insertStickyNoteStmt.run({
    title: input.title.trim(),
    content: input.content.trim(),
    color: input.color.trim(),
    assigned_user_id: input.assignedUserId,
    created_by_user_id: input.createdByUserId,
  });

  const created = findStickyNoteByIdStmt.get(Number(result.lastInsertRowid)) as StickyNoteRow | undefined;

  if (!created) {
    throw new Error("Failed to create sticky note.");
  }

  return mapStickyNote(created);
};

export const deleteStickyNote = (id: number): boolean => {
  const result = deleteStickyNoteStmt.run(id);
  return result.changes > 0;
};

export const updateStickyNoteDone = (id: number, isDone: boolean): StickyNote | null => {
  updateStickyNoteDoneStmt.run({
    id,
    is_done: isDone ? 1 : 0,
  });

  const updated = findStickyNoteByIdStmt.get(id) as StickyNoteRow | undefined;
  return updated ? mapStickyNote(updated) : null;
};
