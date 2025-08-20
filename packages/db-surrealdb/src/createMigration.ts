import type { CreateMigration } from 'payload'

import fs from 'fs'
import path from 'path'

import type { SurrealDBAdapter } from './types.js'

export const createMigration: CreateMigration = function createMigration(
  this: SurrealDBAdapter,
  { _file, _forceAcceptWarning, _skipEmpty, migrationName, payload },
) {
  try {
    // Ensure migration directory exists
    if (!fs.existsSync(this.migrationDir)) {
      fs.mkdirSync(this.migrationDir, { recursive: true })
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').split('Z')[0]
    const fileName = migrationName
      ? `${timestamp}_${migrationName}.ts`
      : `${timestamp}_migration.ts`

    const filePath = path.join(this.migrationDir, fileName)

    // Migration template for SurrealDB
    const migrationTemplate = `import type { MigrateUpArgs, MigrateDownArgs } from '@payloadcms/db-surrealdb'

export async function up({ payload, migration }: MigrateUpArgs): Promise<void> {
  // Perform migration up logic here
  // Example: await payload.db.client.query('CREATE TABLE ...')
}

export async function down({ payload, migration }: MigrateDownArgs): Promise<void> {
  // Perform migration down logic here
  // Example: await payload.db.client.query('DROP TABLE ...')
}
`

    // Write migration file
    fs.writeFileSync(filePath, migrationTemplate)

    payload.logger.info(`Created migration: ${fileName}`)
  } catch (error) {
    payload.logger.error({ err: error, msg: 'Error creating migration:' })
    throw error
  }
}
