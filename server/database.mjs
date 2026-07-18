import { mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { DatabaseSync } from 'node:sqlite'

const projectRoot = fileURLToPath(new URL('../', import.meta.url))
export const databasePath = process.env.PULUPULU_DATABASE_PATH
  ? resolve(process.env.PULUPULU_DATABASE_PATH)
  : join(projectRoot, 'database', 'pulupulu.sqlite')

export function openDatabase() {
  mkdirSync(dirname(databasePath), { recursive: true })
  const database = new DatabaseSync(databasePath)
  database.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;')
  return database
}

export function createSchema(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id INTEGER UNIQUE,
      username TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      password_salt TEXT NOT NULL,
      display_name TEXT NOT NULL,
      account_type TEXT NOT NULL CHECK (account_type IN ('member', 'admin')),
      division_role TEXT NOT NULL,
      must_change_password INTEGER NOT NULL DEFAULT 1 CHECK (must_change_password IN (0, 1)),
      is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      last_login_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_users_username_active
      ON users(username, is_active);

    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_token_expires
      ON sessions(token_hash, expires_at);

    CREATE TABLE IF NOT EXISTS private_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender_user_id INTEGER NOT NULL,
      recipient_user_id INTEGER NOT NULL,
      title TEXT NOT NULL DEFAULT '' CHECK (length(title) <= 60),
      body TEXT NOT NULL DEFAULT '' CHECK (length(body) <= 1500),
      closing TEXT NOT NULL DEFAULT '' CHECK (length(closing) <= 80),
      status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent')),
      unlock_at TEXT NOT NULL DEFAULT '2026-08-08T19:00:00+07:00',
      read_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      sent_at TEXT,
      CHECK (sender_user_id <> recipient_user_id),
      FOREIGN KEY (sender_user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (recipient_user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_private_messages_active_draft
      ON private_messages(sender_user_id, recipient_user_id)
      WHERE status = 'draft';

    CREATE INDEX IF NOT EXISTS idx_private_messages_recipient_status
      ON private_messages(recipient_user_id, status, sent_at);

    CREATE TABLE IF NOT EXISTS app_settings (
      setting_key TEXT PRIMARY KEY,
      setting_value TEXT NOT NULL,
      updated_by_user_id INTEGER,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (updated_by_user_id) REFERENCES users(id) ON DELETE SET NULL
    );
  `)

  database.prepare(`
    INSERT OR IGNORE INTO app_settings (setting_key, setting_value)
    VALUES ('global_message_access', 'locked')
  `).run()

  database.prepare(`
    INSERT OR IGNORE INTO app_settings (setting_key, setting_value)
    VALUES ('global_message_release_at', '2026-08-08T19:00:00+07:00')
  `).run()

  const messageColumns = database.prepare('PRAGMA table_info(private_messages)').all()
  if (!messageColumns.some((column) => column.name === 'unlock_at')) {
    database.exec("ALTER TABLE private_messages ADD COLUMN unlock_at TEXT NOT NULL DEFAULT '2026-08-08T19:00:00+07:00'")
  }
  if (!messageColumns.some((column) => column.name === 'read_at')) {
    database.exec('ALTER TABLE private_messages ADD COLUMN read_at TEXT')
  }
}

export function hashPassword(password, salt = randomBytes(16).toString('hex')) {
  return {
    salt,
    hash: scryptSync(password, salt, 64).toString('hex'),
  }
}

export function verifyPassword(password, storedSalt, storedHash) {
  const candidate = scryptSync(password, storedSalt, 64)
  const expected = Buffer.from(storedHash, 'hex')
  return candidate.length === expected.length && timingSafeEqual(candidate, expected)
}
