import { pathToFileURL } from 'node:url'
import { closeDatabase, hashPassword, query, withTransaction } from './database.mjs'
import { seedAccounts as seedAccountDefinitions } from './seed-data.mjs'

export function resolveSeedAccounts(definitions = seedAccountDefinitions, environment = process.env) {
  const missingVariables = []
  const accounts = definitions.map(({ passwordEnv, ...account }) => {
    const password = environment[passwordEnv]
    if (typeof password !== 'string' || !password) missingVariables.push(passwordEnv)
    return { ...account, password: password || '' }
  })

  if (missingVariables.length > 0) {
    throw new Error(
      `Password seed belum lengkap. Isi environment variable: ${missingVariables.join(', ')}.`,
    )
  }

  return accounts
}

export function validateSeedAccounts(accounts) {
  if (!Array.isArray(accounts) || accounts.length === 0) {
    throw new Error('Data akun seed tidak boleh kosong.')
  }
  if (accounts.some(({ username, displayName, divisionRole }) => (
    typeof username !== 'string' || !username.trim() ||
    typeof displayName !== 'string' || !displayName.trim() ||
    typeof divisionRole !== 'string' || !divisionRole.trim()
  ))) {
    throw new Error('Username, nama tampilan, dan peran pada data seed tidak boleh kosong.')
  }

  const normalizedUsernames = accounts.map(({ username }) => username.trim().toLowerCase())
  const memberAccounts = accounts.filter(({ accountType }) => accountType === 'member')
  const memberIds = memberAccounts.map(({ memberId }) => memberId)
  const adminAccounts = accounts.filter(({ accountType }) => accountType === 'admin')

  if (accounts.some(({ accountType }) => !['member', 'admin'].includes(accountType))) {
    throw new Error('accountType pada data seed hanya boleh member atau admin.')
  }
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
  if (memberAccounts.length !== 13) {
    throw new Error('Seeder membutuhkan tepat 13 akun anggota.')
  }
  if (adminAccounts[0].memberId !== null) {
    throw new Error('Akun admin harus memiliki memberId null.')
  }
  if (accounts.some(({ password }) => (
    typeof password !== 'string' || password.length < 10 || password.length > 128 ||
    !/[a-z]/.test(password) || !/[A-Z]/.test(password) ||
    !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)
  ))) {
    throw new Error('Setiap password seed harus 10-128 karakter dan memuat huruf besar, huruf kecil, angka, serta simbol.')
  }
}

export async function seedDatabase(accounts = resolveSeedAccounts()) {
  validateSeedAccounts(accounts)

  await withTransaction(async (client) => {
    await client.query('DELETE FROM sessions')

    const memberIds = accounts
      .filter(({ accountType }) => accountType === 'member')
      .map(({ memberId }) => memberId)
    const { rows: existingMembers } = await client.query(
      `SELECT id, member_id
       FROM users
       WHERE account_type = 'member' AND member_id = ANY($1::integer[])`,
      [memberIds],
    )
    const { rows: existingAdmins } = await client.query(`
      SELECT id
      FROM users
      WHERE account_type = 'admin'
      ORDER BY id
      LIMIT 1
    `)

    const memberIdToUserId = new Map(
      existingMembers.map((member) => [Number(member.member_id), member.id]),
    )
    const adminUserId = existingAdmins[0]?.id
    const existingUserIds = accounts
      .map((account) => account.accountType === 'admin'
        ? adminUserId
        : memberIdToUserId.get(account.memberId))
      .filter((userId) => userId !== undefined)

    await client.query(
      `UPDATE users
       SET username = CONCAT('__reseed_', account_type, '_', id, '__'),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ANY($1::bigint[])
          OR LOWER(username) = ANY($2::text[])`,
      [existingUserIds, accounts.map(({ username }) => username.trim().toLowerCase())],
    )

    const seededUserIds = []
    for (const account of accounts) {
      const { hash, salt } = hashPassword(account.password)
      const existingUserId = account.accountType === 'admin'
        ? adminUserId
        : memberIdToUserId.get(account.memberId)
      const values = [
        account.memberId,
        account.username.trim(),
        hash,
        salt,
        account.displayName,
        account.accountType,
        account.divisionRole,
      ]

      if (existingUserId !== undefined) {
        const { rows } = await client.query(
          `UPDATE users
           SET member_id = $1,
               username = $2,
               password_hash = $3,
               password_salt = $4,
               display_name = $5,
               account_type = $6,
               division_role = $7,
               must_change_password = TRUE,
               is_active = TRUE,
               last_login_at = NULL,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $8
           RETURNING id`,
          [...values, existingUserId],
        )
        seededUserIds.push(rows[0].id)
      } else {
        const { rows } = await client.query(
          `INSERT INTO users (
             member_id, username, password_hash, password_salt, display_name,
             account_type, division_role, must_change_password, is_active, updated_at
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE, TRUE, CURRENT_TIMESTAMP)
           RETURNING id`,
          values,
        )
        seededUserIds.push(rows[0].id)
      }
    }

    await client.query(
      `UPDATE users
       SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
       WHERE NOT (id = ANY($1::bigint[]))
         AND is_active = TRUE`,
      [seededUserIds],
    )

    const { rows: activeAccountCounts } = await client.query(`
      SELECT
        COUNT(*) FILTER (WHERE account_type = 'member' AND is_active = TRUE) AS members,
        COUNT(*) FILTER (WHERE account_type = 'admin' AND is_active = TRUE) AS admins
      FROM users
    `)
    if (
      Number(activeAccountCounts[0].members) !== 13 ||
      Number(activeAccountCounts[0].admins) !== 1
    ) {
      throw new Error('Seeder gagal memastikan tepat 13 anggota dan satu admin aktif.')
    }
  })

  const { rows } = await query(`
    SELECT username, display_name, account_type
    FROM users
    WHERE LOWER(username) = ANY($1::text[])
      AND is_active = TRUE
    ORDER BY account_type, member_id NULLS LAST
  `, [accounts.map(({ username }) => username.trim().toLowerCase())])

  return rows
}

function isDirectExecution() {
  return Boolean(process.argv[1]) && pathToFileURL(process.argv[1]).href === import.meta.url
}

if (isDirectExecution()) {
  try {
    const seededAccounts = await seedDatabase()
    console.log(`${seededAccounts.length} akun berhasil di-seed ke PostgreSQL.`)
    console.table(seededAccounts.map(({ username, display_name: displayName, account_type: accountType }) => ({
      username,
      name: displayName,
      type: accountType,
    })))
  } catch (error) {
    console.error(`Seeder gagal: ${error instanceof Error ? error.message : String(error)}`)
    process.exitCode = 1
  } finally {
    await closeDatabase()
  }
}
