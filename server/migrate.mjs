import { createHash } from 'node:crypto'
import { readdir, readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { closeDatabase, withTransaction } from './database.mjs'

const migrationsDirectory = join(dirname(fileURLToPath(import.meta.url)), 'migrations')
const migrationFilePattern = /^\d+[a-z0-9_-]*\.sql$/i

async function readMigrations() {
  const filenames = (await readdir(migrationsDirectory))
    .filter((filename) => migrationFilePattern.test(filename))
    .sort((left, right) => left.localeCompare(right, 'en'))

  if (filenames.length === 0) {
    throw new Error('Tidak ada migration SQL yang ditemukan di server/migrations.')
  }

  return Promise.all(filenames.map(async (filename) => {
    const source = (await readFile(join(migrationsDirectory, filename), 'utf8'))
      .replace(/\r\n?/g, '\n')
    return {
      version: filename.replace(/\.sql$/i, ''),
      filename,
      source,
      checksum: createHash('sha256').update(source).digest('hex'),
    }
  }))
}

export async function runMigrations({ logger = console } = {}) {
  const migrations = await readMigrations()
  const appliedNow = []

  await withTransaction(async (client) => {
    await client.query("SELECT pg_advisory_xact_lock(hashtext('pulupulu_schema_migrations'))")
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version TEXT PRIMARY KEY,
        filename TEXT NOT NULL,
        checksum TEXT NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `)

    const { rows: appliedRows } = await client.query(`
      SELECT version, filename, checksum
      FROM schema_migrations
      ORDER BY version
    `)
    const appliedByVersion = new Map(appliedRows.map((migration) => [migration.version, migration]))

    for (const migration of migrations) {
      const applied = appliedByVersion.get(migration.version)
      if (applied) {
        if (applied.checksum !== migration.checksum) {
          throw new Error(
            `Migration ${migration.filename} sudah pernah dijalankan, tetapi checksum-nya berubah. Buat migration baru alih-alih mengubah file lama.`,
          )
        }
        continue
      }

      await client.query(migration.source)
      await client.query(
        `INSERT INTO schema_migrations (version, filename, checksum)
         VALUES ($1, $2, $3)`,
        [migration.version, migration.filename, migration.checksum],
      )
      appliedNow.push(migration.filename)
    }
  })

  if (appliedNow.length === 0) {
    logger.info('Database sudah menggunakan schema terbaru.')
  } else {
    for (const filename of appliedNow) {
      logger.info(`Migration diterapkan: ${filename}`)
    }
  }

  return appliedNow
}

function isDirectExecution() {
  return Boolean(process.argv[1]) && pathToFileURL(process.argv[1]).href === import.meta.url
}

if (isDirectExecution()) {
  try {
    await runMigrations()
  } catch (error) {
    console.error(`Migration gagal: ${error instanceof Error ? error.message : String(error)}`)
    process.exitCode = 1
  } finally {
    await closeDatabase()
  }
}
