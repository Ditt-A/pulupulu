import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { Pool, neon } from '@neondatabase/serverless'

const rawDatabaseUrl = process.env.DATABASE_URL?.trim()

export function assertDatabaseConfigured() {
  if (!rawDatabaseUrl) {
    throw new Error(
      'DATABASE_URL belum diatur. Hubungkan Neon ke project Vercel atau isi DATABASE_URL pada file environment lokal.',
    )
  }
  return rawDatabaseUrl
}

const databaseUrl = assertDatabaseConfigured()

let parsedDatabaseUrl
try {
  parsedDatabaseUrl = new URL(databaseUrl)
} catch {
  throw new Error('DATABASE_URL tidak valid. Gunakan connection string PostgreSQL dari Neon.')
}

if (!['postgres:', 'postgresql:'].includes(parsedDatabaseUrl.protocol)) {
  throw new Error('DATABASE_URL harus menggunakan protokol postgres:// atau postgresql://.')
}

export const databaseProvider = 'postgresql'
export const databaseHost = parsedDatabaseUrl.hostname
export const sql = neon(databaseUrl, { fullResults: true })

export function query(text, parameters = []) {
  return sql.query(text, parameters)
}

export async function withTransaction(callback) {
  if (typeof callback !== 'function') {
    throw new TypeError('withTransaction membutuhkan sebuah fungsi callback.')
  }

  // Pool/Client Neon memakai WebSocket untuk transaksi interaktif. Pada
  // serverless, koneksi ini tidak boleh hidup melewati satu invocation, jadi
  // pool sengaja dibuat dan ditutup di dalam setiap transaksi.
  const pool = new Pool({
    connectionString: databaseUrl,
    max: 1,
    connectionTimeoutMillis: 5_000,
  })
  let client
  try {
    client = await pool.connect()
    await client.query('BEGIN')
    const result = await callback(client)
    await client.query('COMMIT')
    return result
  } catch (error) {
    try {
      await client.query('ROLLBACK')
    } catch {
      // Pertahankan error asli jika koneksi sudah terputus saat rollback.
    }
    throw error
  } finally {
    try {
      client?.release()
    } catch (cleanupError) {
      console.error('Gagal melepaskan koneksi PostgreSQL:', cleanupError)
    }

    try {
      await pool.end()
    } catch (cleanupError) {
      // Transaksi mungkin sudah COMMIT. Jangan melempar error cleanup karena
      // retry dari pemanggil dapat menggandakan perubahan yang sudah tersimpan.
      console.error('Gagal menutup koneksi PostgreSQL:', cleanupError)
    }
  }
}

export async function closeDatabase() {
  // Query non-transaksional menggunakan HTTP dan tidak menyimpan koneksi.
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
