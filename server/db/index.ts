import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const dbPath = process.env.DB_PATH ?? path.join(__dirname, '../../data/medlens.db');

// Ensure directory exists (skip for :memory:)
if (dbPath !== ':memory:') {
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
}

export const db = new DatabaseSync(dbPath);

export function initializeDatabase(): void {
  // Enable WAL mode and foreign keys (best-effort — not all SQLite builds support WAL)
  try {
    db.exec('PRAGMA journal_mode = WAL');
    db.exec('PRAGMA foreign_keys = ON');
  } catch {
    // Ignore PRAGMA errors in test/memory mode
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS patients (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      age INTEGER NOT NULL,
      sex TEXT NOT NULL,
      symptoms TEXT,
      conditions TEXT,
      allergies TEXT,
      medications TEXT,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      file_path TEXT NOT NULL,
      upload_date TEXT NOT NULL,
      extracted_at TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      error_message TEXT,
      FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS lab_results (
      id TEXT PRIMARY KEY,
      report_id TEXT NOT NULL,
      patient_id TEXT NOT NULL,
      test_name TEXT NOT NULL,
      value TEXT,
      unit TEXT,
      reference_range_low REAL,
      reference_range_high REAL,
      reference_range_text TEXT,
      report_date TEXT,
      flag_text TEXT,
      confidence REAL,
      range_label TEXT,
      source TEXT NOT NULL DEFAULT 'ai_extracted',
      verified_at TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE,
      FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL,
      action TEXT NOT NULL,
      details TEXT,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_reports_patient ON reports(patient_id);
    CREATE INDEX IF NOT EXISTS idx_lab_results_report ON lab_results(report_id);
    CREATE INDEX IF NOT EXISTS idx_lab_results_patient ON lab_results(patient_id);
    CREATE INDEX IF NOT EXISTS idx_audit_patient ON audit_log(patient_id);
  `);
}

// Helper: run a transaction
export function transaction<T>(fn: () => T): T {
  db.exec('BEGIN');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

// Helper types that mirror better-sqlite3's interface for compatibility
type Row = Record<string, unknown>;
type SQLParam = string | number | bigint | null | Uint8Array;

export function dbGet(sql: string, ...params: unknown[]): Row | undefined {
  const stmt = db.prepare(sql);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = (stmt.get as (...a: any[]) => Row | undefined)(...params);
  return result;
}

export function dbAll(sql: string, ...params: unknown[]): Row[] {
  const stmt = db.prepare(sql);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (stmt.all as (...a: any[]) => Row[])(...params);
}

export function dbRun(sql: string, ...params: unknown[]): void {
  const stmt = db.prepare(sql);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (stmt.run as (...a: any[]) => void)(...params);
}

// Re-export for use in route files
export type { SQLParam };
