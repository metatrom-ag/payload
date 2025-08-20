import type { MigrateFresh } from 'payload'

import type { SurrealDBAdapter } from './types.js'

export const migrateFresh: MigrateFresh = async function migrateFresh(
  this: SurrealDBAdapter,
  { forceAcceptWarning },
) {
  const { payload } = this

  if (!forceAcceptWarning) {
    payload.logger.warn('migrateFresh will drop all data in the database!')
    payload.logger.warn('Use forceAcceptWarning: true to proceed')
    return
  }

  try {
    payload.logger.info('Starting fresh migration for SurrealDB...')

    // Get all tables
    const [tables] = await this.client.query('INFO FOR DB')

    // Drop all tables
    if (tables && typeof tables === 'object') {
      const tableNames = Object.keys(tables.tb || {})
      for (const tableName of tableNames) {
        await this.client.query(`REMOVE TABLE ${tableName}`)
        payload.logger.info(`Dropped table: ${tableName}`)
      }
    }

    // Re-initialize the database schema
    await this.init()

    payload.logger.info('Fresh migration completed successfully')
  } catch (error) {
    payload.logger.error({ err: error, msg: 'Error during fresh migration:' })
    throw error
  }
}
