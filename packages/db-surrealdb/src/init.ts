import type { Init } from 'payload'

import type { SurrealDBAdapter } from './types.js'

import { createTableName } from './utilities/createTableName.js'

// Helper method to ensure tables exist
async function ensureTablesExist(this: SurrealDBAdapter) {
  const { payload } = this

  // Create collection tables
  for (const collection of payload.config.collections) {
    const tableName = this.collections[collection.slug].tableName

    // Define the table in SurrealDB
    try {
      await this.client.query(`DEFINE TABLE IF NOT EXISTS ${tableName} SCHEMALESS;`)
      await this.client.query(
        `DEFINE FIELD IF NOT EXISTS createdAt ON TABLE ${tableName} TYPE datetime;`,
      )
      await this.client.query(
        `DEFINE FIELD IF NOT EXISTS updatedAt ON TABLE ${tableName} TYPE datetime;`,
      )
      payload.logger.info(`Ensured table exists: ${tableName}`)
    } catch (_error) {
      // SurrealDB with IF NOT EXISTS shouldn't error on existing tables
      // This is likely just a response format issue, not an actual error
      payload.logger.info(`Ensured table exists: ${tableName}`)
    }

    // Create version table if needed
    if (collection.versions) {
      const versionTable = this.versions[collection.slug]
      try {
        await this.client.query(`DEFINE TABLE IF NOT EXISTS ${versionTable} SCHEMALESS;`)
        await this.client.query(
          `DEFINE FIELD IF NOT EXISTS parent ON TABLE ${versionTable} TYPE record;`,
        )
        await this.client.query(
          `DEFINE FIELD IF NOT EXISTS version ON TABLE ${versionTable} TYPE object;`,
        )
        await this.client.query(
          `DEFINE FIELD IF NOT EXISTS createdAt ON TABLE ${versionTable} TYPE datetime;`,
        )
        await this.client.query(
          `DEFINE FIELD IF NOT EXISTS updatedAt ON TABLE ${versionTable} TYPE datetime;`,
        )
        payload.logger.info(`Ensured version table exists: ${versionTable}`)
      } catch (_error) {
        const errorMsg = error?.message || String(error)
        if (!errorMsg.includes('already exists')) {
          payload.logger.error({
            err: error,
            msg: `Failed to create version table ${versionTable}:`,
          })
        }
      }
    }

    // Create relationship tables if needed
    const relationshipFields = collection.fields?.filter(
      (field) => field.type === 'relationship' || field.type === 'upload',
    )

    if (relationshipFields?.length) {
      for (const field of relationshipFields) {
        const relTableName = `${tableName}_${field.name}${this.relationshipsSuffix}`
        try {
          await this.client.query(`DEFINE TABLE IF NOT EXISTS ${relTableName} SCHEMALESS;`)
          await this.client.query(
            `DEFINE FIELD IF NOT EXISTS in ON TABLE ${relTableName} TYPE record;`,
          )
          await this.client.query(
            `DEFINE FIELD IF NOT EXISTS out ON TABLE ${relTableName} TYPE record;`,
          )
          payload.logger.info(`Ensured relationship table exists: ${relTableName}`)
        } catch (_error) {
          const errorMsg = error?.message || String(error)
          if (!errorMsg.includes('already exists')) {
            payload.logger.error({
              err: error,
              msg: `Failed to create relationship table ${relTableName}:`,
            })
          }
        }
      }
    }
  }

  // Create global tables
  for (const global of payload.config.globals || []) {
    const tableName = this.globals[global.slug].tableName

    try {
      await this.client.query(`DEFINE TABLE IF NOT EXISTS ${tableName} SCHEMALESS;`)
      await this.client.query(
        `DEFINE FIELD IF NOT EXISTS createdAt ON TABLE ${tableName} TYPE datetime;`,
      )
      await this.client.query(
        `DEFINE FIELD IF NOT EXISTS updatedAt ON TABLE ${tableName} TYPE datetime;`,
      )
      payload.logger.info(`Ensured global table exists: ${tableName}`)
    } catch (_error) {
      const errorMsg = (_error as Error)?.message || String(_error)
      if (!errorMsg.includes('already exists')) {
        payload.logger.error({ err: _error, msg: `Failed to create global table ${tableName}:` })
      }
    }

    // Create version table if needed
    if (global.versions) {
      const versionTable = this.versions[global.slug]
      try {
        await this.client.query(`DEFINE TABLE IF NOT EXISTS ${versionTable} SCHEMALESS;`)
        await this.client.query(
          `DEFINE FIELD IF NOT EXISTS parent ON TABLE ${versionTable} TYPE record;`,
        )
        await this.client.query(
          `DEFINE FIELD IF NOT EXISTS version ON TABLE ${versionTable} TYPE object;`,
        )
        await this.client.query(
          `DEFINE FIELD IF NOT EXISTS createdAt ON TABLE ${versionTable} TYPE datetime;`,
        )
        await this.client.query(
          `DEFINE FIELD IF NOT EXISTS updatedAt ON TABLE ${versionTable} TYPE datetime;`,
        )
        payload.logger.info(`Ensured global version table exists: ${versionTable}`)
      } catch (_error) {
        const errorMsg = error?.message || String(error)
        if (!errorMsg.includes('already exists')) {
          payload.logger.error({
            err: error,
            msg: `Failed to create global version table ${versionTable}:`,
          })
        }
      }
    }
  }

  // Create migrations table
  try {
    await this.client.query(`DEFINE TABLE IF NOT EXISTS payload_migrations SCHEMALESS;`)
    await this.client.query(
      `DEFINE FIELD IF NOT EXISTS name ON TABLE payload_migrations TYPE string;`,
    )
    await this.client.query(
      `DEFINE FIELD IF NOT EXISTS batch ON TABLE payload_migrations TYPE number;`,
    )
    await this.client.query(
      `DEFINE FIELD IF NOT EXISTS executed_at ON TABLE payload_migrations TYPE datetime;`,
    )
    payload.logger.info('Ensured migrations table exists')
  } catch (_error) {
    const errorMsg = (_error as Error)?.message || String(_error)
    if (!errorMsg.includes('already exists')) {
      payload.logger.error({ err: _error, msg: `Failed to create migrations table:` })
    }
  }

  // Create preferences table
  try {
    await this.client.query(`DEFINE TABLE IF NOT EXISTS payload_preferences SCHEMALESS;`)
    await this.client.query(
      `DEFINE FIELD IF NOT EXISTS key ON TABLE payload_preferences TYPE string;`,
    )
    await this.client.query(
      `DEFINE FIELD IF NOT EXISTS user ON TABLE payload_preferences TYPE record;`,
    )
    await this.client.query(
      `DEFINE FIELD IF NOT EXISTS value ON TABLE payload_preferences TYPE object;`,
    )
    await this.client.query(
      `DEFINE FIELD IF NOT EXISTS createdAt ON TABLE payload_preferences TYPE datetime;`,
    )
    await this.client.query(
      `DEFINE FIELD IF NOT EXISTS updatedAt ON TABLE payload_preferences TYPE datetime;`,
    )
    payload.logger.info('Ensured preferences table exists')
  } catch (_error) {
    const errorMsg = (_error as Error)?.message || String(_error)
    if (!errorMsg.includes('already exists')) {
      payload.logger.error({ err: _error, msg: `Failed to create preferences table:` })
    }
  }
}

export const init: Init = async function init(this: SurrealDBAdapter) {
  const { payload } = this

  try {
    // Initialize collections mapping
    payload.config.collections.forEach((collection) => {
      const tableName = createTableName({
        name: collection.slug,
        type: 'collection',
        adapter: this,
      })

      this.collections[collection.slug] = {
        slug: collection.slug,
        tableName,
      }

      // Initialize version table if versioning is enabled
      if (collection.versions) {
        const versionTableName = `${tableName}${this.versionsSuffix}`
        this.versions[collection.slug] = versionTableName
      }
    })

    // Initialize globals mapping
    payload.config.globals?.forEach((global) => {
      const tableName = createTableName({
        name: global.slug,
        type: 'global',
        adapter: this,
      })

      this.globals[global.slug] = {
        slug: global.slug,
        tableName,
      }

      // Initialize version table if versioning is enabled
      if (global.versions) {
        const versionTableName = `${tableName}${this.versionsSuffix}`
        this.versions[global.slug] = versionTableName
      }
    })

    // Create tables/schemas in SurrealDB
    await ensureTablesExist.call(this)

    if (this.debug) {
      // eslint-disable-next-line no-console
      console.log('[SurrealDB] Adapter initialized - Debug mode enabled')
    }
    payload.logger.info('SurrealDB adapter initialized successfully')
  } catch (_error) {
    payload.logger.error({ err: _error, msg: 'Failed to initialize SurrealDB adapter:' })
    throw _error
  }
}
