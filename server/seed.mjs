import { createSchema, databasePath, hashPassword, openDatabase } from './database.mjs'
import { seedAccounts } from './seed-data.mjs'

const database = openDatabase()
createSchema(database)

const normalizedUsernames = seedAccounts.map(({ username }) => username.trim().toLowerCase())
const memberIds = seedAccounts
  .filter(({ accountType }) => accountType === 'member')
  .map(({ memberId }) => memberId)
const adminAccounts = seedAccounts.filter(({ accountType }) => accountType === 'admin')

if (new Set(normalizedUsernames).size !== normalizedUsernames.length) {
  throw new Error('Username pada seed-data.mjs harus unik.')
}
if (memberIds.some((memberId) => !Number.isInteger(memberId))) {
  throw new Error('Setiap akun anggota harus memiliki memberId berupa angka.')
}
if (new Set(memberIds).size !== memberIds.length) {
  throw new Error('memberId pada seed-data.mjs harus unik.')
}
if (adminAccounts.length !== 1) {
  throw new Error('Seeder membutuhkan tepat satu akun admin.')
}

const findMember = database.prepare(`
  SELECT id
  FROM users
  WHERE member_id = ? AND account_type = 'member'
`)
const findAdmin = database.prepare(`
  SELECT id
  FROM users
  WHERE account_type = 'admin'
  ORDER BY id
  LIMIT 1
`)
const reserveUsername = database.prepare(`
  UPDATE users
  SET username = ?, updated_at = CURRENT_TIMESTAMP
  WHERE id = ?
`)
const insertAccount = database.prepare(`
  INSERT INTO users (
    member_id, username, password_hash, password_salt, display_name,
    account_type, division_role, must_change_password, is_active, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1, CURRENT_TIMESTAMP)
`)
const updateAccount = database.prepare(`
  UPDATE users
  SET member_id = ?,
    username = ?,
    password_hash = ?,
    password_salt = ?,
    display_name = ?,
    account_type = ?,
    division_role = ?,
    must_change_password = 1,
    is_active = 1,
    last_login_at = NULL,
    updated_at = CURRENT_TIMESTAMP
  WHERE id = ?
`)

database.exec('BEGIN IMMEDIATE')
try {
  database.exec('DELETE FROM sessions')

  const existingAccountIds = new Map()
  for (const account of seedAccounts) {
    const existing = account.accountType === 'admin'
      ? findAdmin.get()
      : findMember.get(account.memberId)

    if (existing) {
      existingAccountIds.set(account, existing.id)
      reserveUsername.run(`__reseed_${account.accountType}_${existing.id}__`, existing.id)
    }
  }

  for (const account of seedAccounts) {
    const { hash, salt } = hashPassword(account.password)
    const values = [
      account.memberId,
      account.username.trim(),
      hash,
      salt,
      account.displayName,
      account.accountType,
      account.divisionRole,
    ]
    const existingId = existingAccountIds.get(account)

    if (existingId) {
      updateAccount.run(...values, existingId)
    } else {
      insertAccount.run(...values)
    }
  }
  database.exec('COMMIT')
} catch (error) {
  database.exec('ROLLBACK')
  throw error
} finally {
  database.close()
}

console.log(`\nSQLite database created: ${databasePath}`)
console.log(`${seedAccounts.length} accounts seeded. Passwords are stored as salted scrypt hashes.\n`)
console.table(seedAccounts.map(({ username, password, displayName, accountType }) => ({
  username,
  password,
  name: displayName,
  type: accountType,
})))
