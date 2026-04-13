import fs from "node:fs";
import bcrypt from "bcryptjs";
import Database from "better-sqlite3";

const dataDir = new URL("../data/", import.meta.url);
const dbFile = new URL("../data/qa-upskill.db", import.meta.url);

fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(dbFile.pathname);

db.pragma("journal_mode = WAL");

db.exec("DELETE FROM sticky_notes");
db.exec("DELETE FROM users");
db.exec("DELETE FROM sqlite_sequence WHERE name IN ('users', 'sticky_notes')");

const email = (process.env.QA_UPSKILL_ADMIN_EMAIL ?? "admin@qaupskill.local").trim().toLowerCase();
const password = process.env.QA_UPSKILL_ADMIN_PASSWORD ?? "Admin123!";
const passwordHash = bcrypt.hashSync(password, 10);

db.prepare("INSERT INTO users (full_name, email, password_hash, role) VALUES (?, ?, ?, ?)").run(
  "QA Admin",
  email,
  passwordHash,
  "Admin"
);

db.close();

console.log("Database reset complete.");
console.log(`Bootstrap admin email: ${email}`);
console.log(`Bootstrap admin password: ${password}`);
