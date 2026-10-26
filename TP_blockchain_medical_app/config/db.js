// config/db.js
// Connexion SQLite + définition du schéma.

const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, '..', 'database.sqlite');
const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('medecin', 'patient')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS doctor_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  specialty TEXT,
  phone TEXT
);

CREATE TABLE IF NOT EXISTS patient_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  birth_date TEXT,
  gender TEXT,
  phone TEXT,
  blood_type TEXT,
  address TEXT
);

CREATE TABLE IF NOT EXISTS patient_doctor_assignments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL UNIQUE REFERENCES patient_profiles(id) ON DELETE CASCADE,
  doctor_id INTEGER NOT NULL REFERENCES doctor_profiles(id) ON DELETE CASCADE,
  assigned_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS consultations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL REFERENCES patient_profiles(id) ON DELETE CASCADE,
  doctor_id INTEGER NOT NULL REFERENCES doctor_profiles(id) ON DELETE CASCADE,
  date TEXT NOT NULL DEFAULT (datetime('now')),
  reason TEXT,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS diagnostics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  consultation_id INTEGER NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS prescriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  consultation_id INTEGER NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
  medication TEXT NOT NULL,
  dosage TEXT,
  duration TEXT,
  instructions TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`);

const firstDoctor = db.prepare('SELECT id FROM doctor_profiles ORDER BY id ASC LIMIT 1').get();
if (firstDoctor) {
  const patientsWithoutAssignment = db
    .prepare(
      `SELECT pp.id
       FROM patient_profiles pp
       LEFT JOIN patient_doctor_assignments pda ON pda.patient_id = pp.id
       WHERE pda.id IS NULL`
    )
    .all();

  for (const patient of patientsWithoutAssignment) {
    db.prepare(
      'INSERT OR IGNORE INTO patient_doctor_assignments (patient_id, doctor_id) VALUES (?, ?)'
    ).run(patient.id, firstDoctor.id);
  }
}

module.exports = db;
